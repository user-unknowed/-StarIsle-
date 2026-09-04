# 心理测评反馈微信小程序

StarIsle 导入的心理测评反馈微信小程序（学生/教师/管理员三角色 + 罗夏TAT自定义图片测评 + AI情绪分析 + 教师审核 + 匿名科研导出 + 管理员危机干预）。

## 依赖安装

8 个 cloudfunctions 需逐个 `npm install` 后上传：login / classOperate / imageOperate / taskOperate / feedbackSubmit / aiAnalyze / cacheClear / statusOperate / crisis。

## 初始化脚本

- `scripts/seed-images.js`：系统图片初始化（罗夏 10 张 + TAT 6 张）。
- `scripts/create-admin-user.md`：管理员账号手工创建说明。
