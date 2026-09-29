// assessment_handler.go - 心理测评 HTTP 处理器
//
// 透传型 handler：所有请求原样代理到 Java 后端。
package handlers

import "github.com/gin-gonic/gin"

// GetAssessmentQuestions 透传到 Java 后端 GET /api/v1/assessment/questions/:type
func GetAssessmentQuestions(c *gin.Context) {
	JavaCli.Proxy(c)
}

// SubmitAssessment 透传到 Java 后端 POST /api/v1/assessment/submit
func SubmitAssessment(c *gin.Context) {
	JavaCli.Proxy(c)
}

// GetAssessmentResult 透传到 Java 后端 GET /api/v1/assessment/result/:id
func GetAssessmentResult(c *gin.Context) {
	JavaCli.Proxy(c)
}
