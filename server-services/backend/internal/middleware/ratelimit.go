package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"starisle-backend/internal/config"
)

// clientCounter 是单实例内存限流计数器。
// 生产环境应替换为 Redis 滑动窗口实现以支持多实例一致性。
type clientCounter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
}

func newClientCounter() *clientCounter {
	return &clientCounter{
		requests: make(map[string][]time.Time),
	}
}

// allow 检查指定 IP 在过去 1 秒内是否超过 RPS 限制。
func (cc *clientCounter) allow(ip string, rps int) bool {
	cc.mu.Lock()
	defer cc.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-time.Second)

	// 清理过期记录
	old := cc.requests[ip]
	valid := old[:0]
	for _, t := range old {
		if t.After(windowStart) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rps {
		cc.requests[ip] = valid
		return false
	}

	cc.requests[ip] = append(valid, now)
	return true
}

// 全局单例计数器
var globalCounter = newClientCounter()

// RateLimit 返回基于 IP 的限流中间件。
// Redis 不可用时降级为内存计数器（单实例有效）。
func RateLimit(cfg *config.Config) gin.HandlerFunc {
	rps := cfg.RateLimitRPS
	if rps <= 0 {
		rps = 100
	}

	return func(c *gin.Context) {
		ip := c.ClientIP()

		if !globalCounter.allow(ip, rps) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "请求过于频繁，请稍后再试",
			})
			return
		}

		c.Next()
	}
}
