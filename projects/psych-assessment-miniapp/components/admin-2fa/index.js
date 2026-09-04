// components/admin-2fa/index.js 空壳（Task14 补全真实逻辑）
Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '管理员二次验证' }
  },
  data: {
    code: '',
    password: '',
    sending: false,
    verifying: false
  },
  methods: {
    onClose: function () { this.triggerEvent('close'); },
    onSendCode: function () { this.triggerEvent('send'); },
    onInputPassword: function (e) { this.setData({ password: (e.detail && e.detail.value) || '' }); },
    onInputCode: function (e) { this.setData({ code: (e.detail && e.detail.value) || '' }); },
    onConfirm: function () { this.triggerEvent('confirm', { password: this.data.password, code: this.data.code }); }
  }
});
