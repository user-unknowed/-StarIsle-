// clients.go - handler 包的依赖注入入口，持有 Java 后端与 AI 引擎客户端
package handlers

import "starisle-backend/internal/service"

// JavaCli 和 AICli 是包级客户端实例，由 Init 在 main 启动时注入。
// handler 通过它们访问下游服务，不直接持有连接或配置。
var (
	JavaCli *service.JavaClient
	AICli   *service.AIClient
)

// Init 注入下游服务客户端。必须在路由注册前调用。
func Init(java *service.JavaClient, ai *service.AIClient) {
	JavaCli = java
	AICli = ai
}
