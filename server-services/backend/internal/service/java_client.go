// Package service 提供网关到下游服务（Java 后端、AI 引擎）的客户端封装。
package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
)

// JavaClient 封装到 Java Spring Boot 后端的反向代理。
// 透传型 handler 使用 Proxy 方法将请求原样转发到 Java 后端，
// 不引入业务逻辑。
type JavaClient struct {
	proxy     *httputil.ReverseProxy
	targetURL *url.URL
	client    *http.Client
}

// NewJavaClient 创建到 Java 后端的反向代理客户端。
// 超时预算：连接 3s，响应头 10s，空闲连接 90s。
func NewJavaClient(target string) *JavaClient {
	targetURL, _ := url.Parse(target)

	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
		DialContext: (&net.Dialer{
			Timeout:   3 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		ResponseHeaderTimeout: 10 * time.Second,
	}

	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = targetURL.Scheme
			req.URL.Host = targetURL.Host
			req.Host = targetURL.Host
		},
		Transport: transport,
	}

	client := &http.Client{
		Timeout:   5 * time.Second,
		Transport: transport,
	}

	return &JavaClient{
		proxy:     proxy,
		targetURL: targetURL,
		client:    client,
	}
}

// Proxy 将当前请求原样透传到 Java 后端。
// Go 路由路径与 Java 路由路径一致（均挂载在 /api/v1 下），
// 因此不需要路径重写。
func (jc *JavaClient) Proxy(c *gin.Context) {
	jc.proxy.ServeHTTP(c.Writer, c.Request)
}

// Post 向 Java 后端发起 POST JSON 请求（用于异步持久化等编排场景）。
// 超时 5s，失败返回错误但不影响调用方（编排 handler 在 goroutine 中调用）。
func (jc *JavaClient) Post(ctx context.Context, path string, body interface{}) error {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("序列化请求体失败: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		jc.targetURL.String()+path, bytes.NewReader(jsonBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := jc.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("Java 后端返回 %d", resp.StatusCode)
	}
	return nil
}
