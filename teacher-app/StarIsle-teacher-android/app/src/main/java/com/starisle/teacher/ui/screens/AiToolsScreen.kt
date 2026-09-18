package com.starisle.teacher.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.starisle.teacher.theme.ErrorColor
import com.starisle.teacher.theme.StarNightBlue
import com.starisle.teacher.ui.viewmodel.AiViewModel

/**
 * AI 辅助工具页面。
 *
 * 对应 Dart 端 `screens/ai_tools_screen.dart`：
 * - 四项 AI 能力卡片：文章生成 / 内容摘要 / 风格转换 / 主题分析；
 * - API Key 配置对话框；
 * - 加载 / 结果 / 错误状态展示。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiToolsScreen(
    onBack: () -> Unit = {},
    viewModel: AiViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var showApiKeyDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    fun snack(msg: String) {
        scope.launch { snackbarHostState.showSnackbar(msg) }
    }

    // 表单状态
    var apiKeyInput by remember { mutableStateOf("") }
    var topicInput by remember { mutableStateOf("") }
    var contentInput by remember { mutableStateOf("") }
    var selectedStyle by remember { mutableStateOf("professional") }
    var targetStyle by remember { mutableStateOf("warm") }
    var wordCount by remember { mutableFloatStateOf(800f) }

    val styleOptions = listOf(
        "professional" to "专业",
        "casual" to "休闲",
        "warm" to "温暖",
        "humorous" to "幽默",
        "inspirational" to "励志",
        "academic" to "学术",
        "simple" to "简洁",
    )

    fun styleLabel(value: String): String = styleOptions.firstOrNull { it.first == value }?.second ?: value

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI辅助工具") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(onClick = { showApiKeyDialog = true }) {
                        Icon(Icons.Filled.Settings, contentDescription = "配置API密钥")
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            // 文章生成
            SectionTitle("文章生成")
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    OutlinedTextField(
                        value = topicInput,
                        onValueChange = { topicInput = it },
                        label = { Text("文章主题") },
                        placeholder = { Text("请输入文章主题或关键词") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("写作风格：")
                        Spacer(Modifier.width(8.dp))
                        StyleDropdown(
                            selected = selectedStyle,
                            options = styleOptions,
                            onSelected = { selectedStyle = it },
                            labelOf = ::styleLabel,
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("字数：")
                        Spacer(Modifier.width(8.dp))
                        Slider(
                            value = wordCount,
                            onValueChange = { wordCount = it },
                            valueRange = 200f..2000f,
                            steps = 8,
                            modifier = Modifier.weight(1f),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("${wordCount.toInt()}字")
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = {
                            if (topicInput.isBlank()) {
                                snack("请输入文章主题")
                                return@Button
                            }
                            viewModel.generateArticle(
                                topic = topicInput,
                                style = selectedStyle,
                                wordCount = wordCount.toInt(),
                            )
                        },
                    ) { Text("生成文章") }
                }
            }
            Spacer(Modifier.height(24.dp))

            // 内容摘要
            SectionTitle("内容摘要")
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    OutlinedTextField(
                        value = contentInput,
                        onValueChange = { contentInput = it },
                        label = { Text("输入内容") },
                        placeholder = { Text("请输入需要摘要的文本内容") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(160.dp),
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = {
                            if (contentInput.isBlank()) {
                                snack("请输入内容")
                                return@Button
                            }
                            viewModel.summarizeContent(content = contentInput)
                        },
                    ) { Text("生成摘要") }
                }
            }
            Spacer(Modifier.height(24.dp))

            // 风格转换
            SectionTitle("风格转换")
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    OutlinedTextField(
                        value = contentInput,
                        onValueChange = { contentInput = it },
                        label = { Text("输入文本") },
                        placeholder = { Text("请输入需要转换风格的文本") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(160.dp),
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("目标风格：")
                        Spacer(Modifier.width(8.dp))
                        StyleDropdown(
                            selected = targetStyle,
                            options = styleOptions,
                            onSelected = { targetStyle = it },
                            labelOf = ::styleLabel,
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = {
                            if (contentInput.isBlank()) {
                                snack("请输入文本")
                                return@Button
                            }
                            viewModel.convertStyle(content = contentInput, targetStyle = targetStyle)
                        },
                    ) { Text("转换风格") }
                }
            }
            Spacer(Modifier.height(24.dp))

            // 主题分析
            SectionTitle("主题分析")
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    OutlinedTextField(
                        value = contentInput,
                        onValueChange = { contentInput = it },
                        label = { Text("分析文本") },
                        placeholder = { Text("请输入需要分析的文本") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(160.dp),
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = {
                            if (contentInput.isBlank()) {
                                snack("请输入文本")
                                return@Button
                            }
                            viewModel.analyzeTopic(content = contentInput)
                        },
                    ) { Text("开始分析") }
                }
            }
            Spacer(Modifier.height(24.dp))

            // 加载中提示
            if (state.isLoading) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                ) { CircularProgressIndicator() }
            }

            // 结果展示
            state.result?.let {
                ResultCard(title = "结果", body = it)
            }

            // 错误展示
            state.error?.let { err ->
                ErrorCard(err)
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
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.setApiKey(apiKeyInput)
                    showApiKeyDialog = false
                }) { Text("保存") }
            },
            dismissButton = {
                TextButton(onClick = { showApiKeyDialog = false }) { Text("取消") }
            },
        )
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(bottom = 8.dp),
    )
}

@Composable
private fun ResultCard(title: String, body: String) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp),
        colors = CardDefaults.cardColors(containerColor = StarNightBlue.copy(alpha = 0.05f)),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = StarNightBlue)
            Spacer(Modifier.height(8.dp))
            Text(body, fontSize = 14.sp)
        }
    }
}

@Composable
private fun ErrorCard(message: String) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp),
        colors = CardDefaults.cardColors(containerColor = ErrorColor.copy(alpha = 0.1f)),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("错误", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = ErrorColor)
            Spacer(Modifier.height(8.dp))
            Text(message, fontSize = 14.sp, color = ErrorColor)
        }
    }
}

/**
 * 简化版 Dropdown：使用 AlertDialog 选择风格，避免 Material3 ExposedDropdownMenuBox 复杂度。
 */
@Composable
private fun StyleDropdown(
    selected: String,
    options: List<Pair<String, String>>,
    onSelected: (String) -> Unit,
    labelOf: (String) -> String,
) {
    var expanded by remember { mutableStateOf(false) }
    TextButton(onClick = { expanded = true }) {
        Text(labelOf(selected))
    }
    if (expanded) {
        AlertDialog(
            onDismissRequest = { expanded = false },
            title = { Text("选择风格") },
            text = {
                Column {
                    options.forEach { (value, label) ->
                        TextButton(
                            onClick = {
                                onSelected(value)
                                expanded = false
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text(label) }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { expanded = false }) { Text("取消") }
            },
        )
    }
}
