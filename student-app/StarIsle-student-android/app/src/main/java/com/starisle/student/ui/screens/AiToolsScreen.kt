package com.starisle.student.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.starisle.student.theme.StarNightBlue
import com.starisle.student.ui.viewmodel.AiViewModel

// 风格选项与中文标签
private data class StyleOption(val value: String, val label: String)

private val styleOptions = listOf(
    StyleOption("professional", "专业严谨"),
    StyleOption("casual", "轻松随意"),
    StyleOption("warm", "温暖亲切"),
    StyleOption("humorous", "幽默风趣"),
    StyleOption("inspirational", "激励鼓舞"),
    StyleOption("academic", "学术规范"),
    StyleOption("simple", "通俗易懂"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiToolsScreen(
    navController: NavController? = null,
    viewModel: AiViewModel = hiltViewModel(),
) {
    val aiState by viewModel.state.collectAsStateWithLifecycle()

    // 表单状态
    var topic by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var selectedStyle by remember { mutableStateOf("professional") }
    var targetStyle by remember { mutableStateOf("warm") }
    var wordCount by remember { mutableStateOf(800f) }
    var apiKeyInput by remember { mutableStateOf("") }
    var showApiKeyDialog by remember { mutableStateOf(false) }
    val snackbarHost = remember { SnackbarHostState() }

    LaunchedEffect(aiState.error) {
        aiState.error?.let { snackbarHost.showSnackbar(it) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI辅助工具") },
                actions = {
                    IconButton(onClick = { showApiKeyDialog = true }) {
                        Icon(Icons.Filled.Settings, contentDescription = "设置")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = StarNightBlue,
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White,
                ),
            )
        },
        snackbarHost = { SnackbarHost(snackbarHost) },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            // === 文章生成 ===
            Text("文章生成", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    OutlinedTextField(
                        value = topic,
                        onValueChange = { topic = it },
                        label = { Text("文章主题") },
                        placeholder = { Text("请输入文章主题或关键词") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("写作风格：")
                        StyleDropdown(selectedStyle) { selectedStyle = it }
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("字数：")
                        Slider(
                            value = wordCount,
                            onValueChange = { wordCount = it },
                            valueRange = 200f..2000f,
                            steps = 8,
                            modifier = Modifier.weight(1f),
                        )
                        Text("${wordCount.toInt()}字")
                    }
                    Spacer(Modifier.height(12.dp))
                    TextButton(onClick = {
                        if (topic.isBlank()) {
                            return@TextButton
                        }
                        viewModel.generateArticle(
                            topic = topic,
                            style = selectedStyle,
                            wordCount = wordCount.toInt(),
                        )
                    }) { Text("生成文章") }
                }
            }

            // === 内容摘要 ===
            Text("内容摘要", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    OutlinedTextField(
                        value = content,
                        onValueChange = { content = it },
                        label = { Text("输入内容") },
                        placeholder = { Text("请输入需要摘要的文本内容") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 5,
                    )
                    Spacer(Modifier.height(12.dp))
                    TextButton(onClick = {
                        if (content.isBlank()) return@TextButton
                        viewModel.summarizeContent(content = content)
                    }) { Text("生成摘要") }
                }
            }

            // === 风格转换 ===
            Text("风格转换", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    OutlinedTextField(
                        value = content,
                        onValueChange = { content = it },
                        label = { Text("输入文本") },
                        placeholder = { Text("请输入需要转换风格的文本") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 5,
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("目标风格：")
                        StyleDropdown(targetStyle) { targetStyle = it }
                    }
                    Spacer(Modifier.height(12.dp))
                    TextButton(onClick = {
                        if (content.isBlank()) return@TextButton
                        viewModel.convertStyle(
                            content = content,
                            targetStyle = targetStyle,
                        )
                    }) { Text("转换风格") }
                }
            }

            // === 主题分析 ===
            Text("主题分析", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    OutlinedTextField(
                        value = content,
                        onValueChange = { content = it },
                        label = { Text("输入内容") },
                        placeholder = { Text("请输入需要分析的文本内容") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 5,
                    )
                    Spacer(Modifier.height(12.dp))
                    TextButton(onClick = {
                        if (content.isBlank()) return@TextButton
                        viewModel.analyzeTopic(content = content)
                    }) { Text("分析主题") }
                }
            }

            // 加载指示器
            if (aiState.isLoading) {
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }

            // 结果卡片
            aiState.result?.let { result ->
                ResultCard(result = result, onClear = { viewModel.clearResult() })
            }

            // 错误卡片
            aiState.error?.let { error ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "错误",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Red,
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(error)
                        Spacer(Modifier.height(12.dp))
                        TextButton(onClick = { viewModel.clearResult() }) { Text("关闭") }
                    }
                }
            }
        }
    }

    if (showApiKeyDialog) {
        AlertDialog(
            onDismissRequest = { showApiKeyDialog = false },
            title = { Text("配置API密钥") },
            text = {
                OutlinedTextField(
                    value = apiKeyInput,
                    onValueChange = { apiKeyInput = it },
                    label = { Text("API Key") },
                    placeholder = { Text("请输入智谱AI或硅基流动的API密钥") },
                    modifier = Modifier.fillMaxWidth(),
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.setApiKey(apiKeyInput)
                        showApiKeyDialog = false
                    },
                ) { Text("保存") }
            },
            dismissButton = {
                TextButton(onClick = { showApiKeyDialog = false }) { Text("取消") }
            },
        )
    }
}

@Composable
private fun StyleDropdown(
    selected: String,
    onChange: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val label = styleOptions.firstOrNull { it.value == selected }?.label ?: selected
    Box {
        TextButton(onClick = { expanded = true }) { Text(label) }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            styleOptions.forEach { opt ->
                DropdownMenuItem(
                    text = { Text(opt.label) },
                    onClick = {
                        onChange(opt.value)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun ResultCard(
    result: String,
    onClear: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("生成结果", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text(result)
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                TextButton(onClick = {
                    /* TODO: 复制到剪贴板 */
                }) { Text("复制") }
                TextButton(onClick = onClear) { Text("清空") }
            }
        }
    }
}
