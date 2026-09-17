// user_handler.go - 用户管理 HTTP 处理器，提供注册、查询、更新、删除与数据导出
//
// Package handlers 提供星屿后端各业务接口的 HTTP 处理逻辑，
// 本文件聚焦用户模块，负责处理用户注册与账号生命周期管理，
// 以及满足数据合规要求的用户数据导出。
package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

// HealthCheck 健康检查接口，供负载均衡与容器编排做存活探测
// Args:
//   - c: Gin 上下文
func HealthCheck(c *gin.Context) {
    // 返回服务状态、名称与版本信息
    c.JSON(http.StatusOK, gin.H{
        "status":  "healthy",
        "service": "starisle-api",
        "version": "1.0.0",
    })
}

// RegisterUser 处理用户注册请求
// Args:
//   - c: Gin 上下文，请求体包含昵称、头像与年龄段
func RegisterUser(c *gin.Context) {
    // 定义请求结构：绑定昵称、头像URL与年龄段
    var req struct {
        Nickname string `json:"nickname" binding:"required"`  // 用户昵称
        Avatar  string `json:"avatar" binding:"required"`    // 头像URL
        AgeGroup string `json:"age_group" binding:"required"` // 年龄段：如高中生
    }

    // 解析并校验请求 JSON，失败返回 400
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // TODO: 实现用户注册逻辑
    // 1. 生成UUID用户ID
    // 2. 保存用户信息到数据库
    // 3. 生成加密密钥

    // 返回注册成功响应，附带生成的用户ID
    c.JSON(http.StatusOK, gin.H{
        "message": "用户注册成功",
        "user_id": "generated-user-id",
    })
}

// GetUser 根据用户ID返回用户信息
// Args:
//   - c: Gin 上下文，从 URL 参数 id 获取用户ID
func GetUser(c *gin.Context) {
    // 读取用户ID
    userId := c.Param("id")

    // TODO: 从数据库获取用户信息

    // 返回用户基本信息：昵称、头像与年龄段
    c.JSON(http.StatusOK, gin.H{
        "user_id":   userId,
        "nickname":  "用户昵称",
        "avatar":    "头像URL",
        "age_group": "高中生",
    })
}

// UpdateUser 更新指定用户的信息
// Args:
//   - c: Gin 上下文，从 URL 参数获取用户ID，请求体为待更新字段
func UpdateUser(c *gin.Context) {
    // 读取用户ID
    userId := c.Param("id")

    // 定义请求结构：使用通用 map 接收任意待更新字段
    var req map[string]interface{}
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // TODO: 更新用户信息

    // 返回更新成功响应
    c.JSON(http.StatusOK, gin.H{
        "message": "用户信息更新成功",
        "user_id": userId,
    })
}

// DeleteUser 删除指定用户账号及其关联数据
// Args:
//   - c: Gin 上下文，从 URL 参数 id 获取用户ID
func DeleteUser(c *gin.Context) {
    // 读取用户ID
    userId := c.Param("id")

    // TODO: 实现账号删除逻辑
    // 1. 验证用户权限
    // 2. 删除所有关联数据
    // 3. 删除加密密钥

    // 返回删除成功响应
    c.JSON(http.StatusOK, gin.H{
        "message": "账号已删除",
        "user_id": userId,
    })
}

// ExportUserData 导出指定用户的全量数据，满足数据合规要求
// Args:
//   - c: Gin 上下文，从 URL 参数 id 获取用户ID
func ExportUserData(c *gin.Context) {
    // 读取用户ID
    userId := c.Param("id")

    // TODO: 实现数据导出逻辑

    // 返回导出成功响应，附带数据格式说明
    c.JSON(http.StatusOK, gin.H{
        "message":     "数据导出成功",
        "user_id":     userId,
        "data_format": "JSON",
    })
}