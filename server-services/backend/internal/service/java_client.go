// Package service 提供网关到下游服务（Java 后端、AI 引擎）的客户端封装。
package service

import (
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
	proxy *httputil.ReverseProxy
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

	return &JavaClient{proxy: proxy}
}

// Proxy 将 gin 上下文中的请求透传到 Java 后端的指定路径。
// handler 调用时传入目标路径（如 "/api/v1/users/register"），
// 方法、请求体、header 原样保留。
func (jc *JavaClient) Proxy(c *gin.Context, targetPath string) {
	c.Request.URL.Path = targetPath
	jc.proxy.ServeHTTP(c.Writer, c.Request)
}

// Post 向 Java 后端发起 POST JSON 请求（用于异步持久化等编排场景）。
// 超时固定为 3s，失败不阻塞调用方（编排 handler 在 goroutine 中调用）。
func (jc *JavaClient) Post(targetPath string, body interface{}) error {
	// 编排场景下 body 通常为 map[string]interface{}
	// 实际 HTTP 调用通过 AIClient 中的 httpClient 统一执行
	// 此处保留接口供 Phase 3 实现
	return nil
}
