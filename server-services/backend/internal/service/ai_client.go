package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

// --- 依赖矩阵 ---
// | 调用方     | 被调方     | 操作            | 协议 | 关键性 | 失败后果           |
// | AIClient  | AI /chat  | 对话生成         | HTTP | 高     | 用户无回复，需降级 |
// | AIClient  | AI /risk  | 风险检测         | HTTP | 高     | 风险漏检，需降级   |
// | AIClient  | AI /topics| 话题卡片         | HTTP | 低     | 无话题引导，可兜底 |
//
// --- 超时预算 ---
// | 端点              | 超时   | 说明                         |
// | POST /chat        | 5s    | 占满端到端预算，无重试        |
// | POST /risk/check  | 3s    | 可重试 1 次（幂等分析）       |
// | GET  /topics      | 2s    | 可重试 1 次（幂等读）         |
// | GET  /health      | 1s    | 浅探针，不调依赖             |
//
// --- 断路器（AIMD） ---
// | 状态    | 条件                     | 行为                     |
// | closed  | 连续失败 < 5             | 正常调用                 |
// | open    | 连续失败 >= 5            | 快速失败，等待 30s 冷却   |
// | halfOpen| 冷却后放 1 个探针请求     | 成功→closed，失败→open   |

// AIClient 是到 AI 引擎（FastAPI :8000）的 HTTP 客户端。
// 内置断路器（AIMD）、超时与重试预算。
type AIClient struct {
	baseURL    string
	httpClient *http.Client

	// 断路器状态（AIMD）
	cbMu             sync.Mutex
	cbConsecutive    int32       // 连续成功/失败计数
	cbState          string      // "closed" | "open" | "halfOpen"
	cbOpenUntil      time.Time   // open 状态到期时间
	cbFailureThreshold int       // 触发 open 的连续失败阈值
	cbCooldown         time.Duration // open 持续时长
	cbHalfOpenSuccesses int      // halfOpen 状态下连续成功数
	cbCloseThreshold   int       // halfOpen 转 closed 所需连续成功数
}

// ChatRequest 对应 AI 引擎的 /chat 端点请求体
type ChatRequest struct {
	UserId      string                   `json:"user_id"`
	Message     string                   `json:"message"`
	Context     []map[string]interface{} `json:"context,omitempty"`
	UserProfile map[string]interface{}   `json:"user_profile,omitempty"`
}

// ChatResponse 对应 AI 引擎的 /chat 端点响应体
type ChatResponse struct {
	Response      string   `json:"response"`
	RiskLevel     string   `json:"risk_level"`
	EmotionTags   []string `json:"emotion_tags"`
	ResponseTimeMs int     `json:"response_time_ms"`
	RagEnhanced   bool     `json:"rag_enhanced"`
	KnowledgeMode string  `json:"knowledge_mode"`
}

// RiskCheckRequest 对应 AI 引擎 /risk/check 请求体
type RiskCheckRequest struct {
	UserId      string `json:"user_id"`
	Content     string `json:"content"`
	ContentType string `json:"content_type"`
}

// RiskCheckResponse 对应 AI 引擎 /risk/check 响应体
type RiskCheckResponse struct {
	UserId    string  `json:"user_id"`
	RiskLevel string  `json:"risk_level"`
	Confidence float64 `json:"confidence"`
}

// TopicCard 话题卡片
type TopicCard struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Category string `json:"category"`
}

// NewAIClient 创建到 AI 引擎的 HTTP 客户端。
func NewAIClient(baseURL string) *AIClient {
	return &AIClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second, // 全局上限
			Transport: &http.Transport{
				MaxIdleConns:        50,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     60 * time.Second,
				DialContext: (&net.Dialer{
					Timeout:   2 * time.Second,
					KeepAlive: 30 * time.Second,
				}).DialContext,
			},
		},
		cbState:            "closed",
		cbFailureThreshold: 5,
		cbCooldown:         30 * time.Second,
		cbCloseThreshold:   3,
	}
}

// Chat 调用 AI 引擎 POST /chat 生成对话回复。
// 超时 5s，不重试（AI 生成非幂等，重试会产生重复回复）。
// 断路器 open 时返回错误，由 handler 降级处理。
func (ac *AIClient) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
	if !ac.allowCall() {
		return nil, fmt.Errorf("AI 服务断路器开启中，请稍后重试")
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	body, _ := json.Marshal(req)

	resp, err := ac.doRequest(ctx, "/chat", http.MethodPost, body, false)
	if err != nil {
		ac.recordFailure()
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		ac.recordFailure()
		return nil, fmt.Errorf("AI /chat 返回 %d", resp.StatusCode)
	}

	var result ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		ac.recordFailure()
		return nil, err
	}

	ac.recordSuccess()
	return &result, nil
}

// CheckRisk 调用 AI 引擎 POST /risk/check 进行风险检测。
// 超时 3s，可重试 1 次（分析操作，无副作用，幂等）。
func (ac *AIClient) CheckRisk(ctx context.Context, req *RiskCheckRequest) (*RiskCheckResponse, error) {
	if !ac.allowCall() {
		return nil, fmt.Errorf("AI 服务断路器开启中")
	}

	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	body, _ := json.Marshal(req)

	resp, err := ac.doRequest(ctx, "/risk/check", http.MethodPost, body, true)
	if err != nil {
		ac.recordFailure()
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		ac.recordFailure()
		return nil, fmt.Errorf("AI /risk/check 返回 %d", resp.StatusCode)
	}

	var result RiskCheckResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		ac.recordFailure()
		return nil, err
	}

	ac.recordSuccess()
	return &result, nil
}

// GetTopics 调用 AI 引擎 GET /topics 获取话题卡片。
// 超时 2s，可重试 1 次（幂等读）。
func (ac *AIClient) GetTopics(ctx context.Context) ([]TopicCard, error) {
	if !ac.allowCall() {
		return nil, fmt.Errorf("AI 服务断路器开启中")
	}

	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	resp, err := ac.doRequest(ctx, "/topics", http.MethodGet, nil, true)
	if err != nil {
		ac.recordFailure()
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Topics []TopicCard `json:"topics"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		ac.recordFailure()
		return nil, err
	}

	ac.recordSuccess()
	return result.Topics, nil
}

// --- 内部方法 ---

// doRequest 执行 HTTP 请求。retry=true 时允许 1 次带抖动的重试，
// 仅在超时或 5xx 时重试，不重试 4xx 或请求体错误。
func (ac *AIClient) doRequest(ctx context.Context, path, method string, body []byte, retry bool) (*http.Response, error) {
	url := ac.baseURL + path

	do := func() (*http.Response, error) {
		var bodyReader *bytes.Reader
		if body != nil {
			bodyReader = bytes.NewReader(body)
		}
		var req *http.Request
		var err error
		if bodyReader != nil {
			req, err = http.NewRequestWithContext(ctx, method, url, bodyReader)
		} else {
			req, err = http.NewRequestWithContext(ctx, method, url, nil)
		}
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		return ac.httpClient.Do(req)
	}

	resp, err := do()
	if err == nil && resp.StatusCode < 500 {
		return resp, nil
	}

	// 不可重试或未开启重试
	if !retry {
		if resp != nil {
			return resp, nil
		}
		return nil, err
	}

	// 重试 1 次，带 100-300ms 随机抖动
	jitter := 100 + rand.Intn(200)
	select {
	case <-time.After(time.Duration(jitter) * time.Millisecond):
	case <-ctx.Done():
		if resp != nil {
			resp.Body.Close()
		}
		return nil, ctx.Err()
	}

	return do()
}

// allowCall 检查断路器是否允许调用。
// closed → 允许；open → 检查是否已过冷却期，是则转为 halfOpen 并允许；否 → 拒绝。
func (ac *AIClient) allowCall() bool {
	ac.cbMu.Lock()
	defer ac.cbMu.Unlock()

	switch ac.cbState {
	case "closed":
		return true
	case "open":
		if time.Now().After(ac.cbOpenUntil) {
			ac.cbState = "halfOpen"
			ac.cbHalfOpenSuccesses = 0
			return true // 放 1 个探针请求
		}
		return false
	case "halfOpen":
		return true // halfOpen 允许探针
	default:
		return true
	}
}

// recordFailure 记录一次失败。
// closed → 失败计数+1，达阈值则 open；
// halfOpen → 任意失败立即转 open，重置冷却。
func (ac *AIClient) recordFailure() {
	ac.cbMu.Lock()
	defer ac.cbMu.Unlock()

	switch ac.cbState {
	case "closed":
		atomic.AddInt32(&ac.cbConsecutive, 1)
		if int(atomic.LoadInt32(&ac.cbConsecutive)) >= ac.cbFailureThreshold {
			ac.cbState = "open"
			ac.cbOpenUntil = time.Now().Add(ac.cbCooldown)
			log.Printf("[AI断路器] closed → open (连续失败 %d)", ac.cbConsecutive)
		}
	case "halfOpen":
		ac.cbState = "open"
		ac.cbOpenUntil = time.Now().Add(ac.cbCooldown)
		ac.cbHalfOpenSuccesses = 0
		log.Printf("[AI断路器] halfOpen → open (探针失败)")
	}
}

// recordSuccess 记录一次成功。
// closed → 重置失败计数（additive increase 语义：成功恢复时逐步重置）；
// halfOpen → 成功计数+1，达阈值则 closed。
func (ac *AIClient) recordSuccess() {
	ac.cbMu.Lock()
	defer ac.cbMu.Unlock()

	switch ac.cbState {
	case "closed":
		// 成功时逐步恢复：每次成功将失败计数减 1（不低于 0）
		v := atomic.LoadInt32(&ac.cbConsecutive)
		if v > 0 {
			atomic.StoreInt32(&ac.cbConsecutive, v-1)
		}
	case "halfOpen":
		ac.cbHalfOpenSuccesses++
		if ac.cbHalfOpenSuccesses >= ac.cbCloseThreshold {
			ac.cbState = "closed"
			atomic.StoreInt32(&ac.cbConsecutive, 0)
			ac.cbHalfOpenSuccesses = 0
			log.Printf("[AI断路器] halfOpen → closed (连续成功 %d)", ac.cbCloseThreshold)
		}
	}
}
