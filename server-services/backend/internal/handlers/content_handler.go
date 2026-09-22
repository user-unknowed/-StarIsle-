// content_handler.go - 内容服务 HTTP 处理器
//
// 透传型 handler：冥想与呼吸练习代理到 Java 后端。
// 静态内容（使用指南、FAQ）由网关本地返回，无需下游调用。
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetMeditationList 透传到 Java 后端 GET /api/v1/content/meditations
func GetMeditationList(c *gin.Context) {
	JavaCli.Proxy(c)
}

// GetMeditationDetail 透传到 Java 后端 GET /api/v1/content/meditation/:id
func GetMeditationDetail(c *gin.Context) {
	JavaCli.Proxy(c)
}

// GetBreathingExercise 透传到 Java 后端 GET /api/v1/content/breathing/:type
func GetBreathingExercise(c *gin.Context) {
	JavaCli.Proxy(c)
}

// GetUserGuide 返回应用使用指南（静态内容，网关本地返回）
func GetUserGuide(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"guide": []map[string]interface{}{
			{"title": "心情打卡", "content": "每天记录你的心情，坚持打卡可以帮助你了解情绪变化规律。"},
			{"title": "AI对话", "content": "和小星聊聊你的感受，它会用心理学的知识陪你探索内心。"},
			{"title": "情绪测评", "content": "定期完成情绪测评，了解自己的心理健康状况。"},
			{"title": "冥想放松", "content": "感到压力时，试试冥想和呼吸练习，帮助自己放松下来。"},
		},
	})
}

// GetFAQ 返回常见问题列表（静态内容，网关本地返回）
func GetFAQ(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"faq": []map[string]interface{}{
			{"question": "我的数据安全吗？", "answer": "我们使用端到端加密保护你的所有数据，只有你能查看。"},
			{"question": "小星会记录我的对话吗？", "answer": "对话内容加密存储，仅用于提升AI回复质量，不会分享给第三方。"},
			{"question": "如果我有心理危机怎么办？", "answer": "点击紧急帮助按钮可直接拨打心理援助热线，系统也会自动提醒信任的联系人。"},
			{"question": "测评结果准吗？", "answer": "测评基于PHQ-9等标准量表，结果仅供自我了解参考，不替代专业诊断。"},
		},
	})
}
