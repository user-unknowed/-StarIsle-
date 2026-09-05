// cloudfunctions/shared/dashscopeClient.js
var https = require('https');

/**
 * DashScope OpenAI 兼容模式调用。
 * API Key 通过云函数环境变量 DASHSCOPE_API_KEY 读取（不要写死！）
 */
function callQwen(opts) {
  opts = opts || {};
  var messages = opts.messages || [];
  var model = opts.model || 'qwen-plus';
  var temperature = typeof opts.temperature === 'number' ? opts.temperature : 0;
  var maxTokens = opts.maxTokens || 1024;
  var apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return Promise.reject({ code: 500, msg: 'DASHSCOPE_API_KEY 未在云函数环境变量配置' });

  var body = JSON.stringify({ model: model, messages: messages, temperature: temperature, max_tokens: maxTokens });
  var options = {
    hostname: 'dashscope.aliyuncs.com',
    path: '/compatible-mode/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    },
    timeout: 25000
  };

  return new Promise(function (resolve, reject) {
    var req = https.request(options, function (res) {
      var data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        if (res.statusCode !== 200) return reject({ code: res.statusCode, msg: String(data).slice(0, 200) });
        try {
          var json = JSON.parse(data);
          var content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
          if (!content) return reject({ code: 502, msg: '千问返回无 choices' });
          resolve(content);
        } catch (e) { reject({ code: 502, msg: '千问返回JSON解析失败: ' + e.message, raw: String(data).slice(0, 300) }); }
      });
    });
    req.on('error', function (err) { reject({ code: 503, msg: '网络错误: ' + err.message }); });
    req.on('timeout', function () { req.destroy(); reject({ code: 504, msg: '千问请求超时25s' }); });
    req.write(body);
    req.end();
  });
}

/** 从大模型返回内容中提取 JSON 片段（兜底，哪怕模型多解释几句也要能解析） */
function extractJSON(text) {
  if (!text) return null;
  // 1) 三引号 ```json ... ```
  var re1 = /```(?:json)?\s*([\s\S]*?)\s*```/;
  var m = re1.exec(text);
  if (m) {
    try { return JSON.parse(m[1]); } catch (e) { /* fallthrough */ }
  }
  // 2) 首尾找第一个{与最后一个}
  var start = text.indexOf('{');
  var end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { /* fallthrough */ }
  }
  return null;
}

module.exports = { callQwen: callQwen, extractJSON: extractJSON };
