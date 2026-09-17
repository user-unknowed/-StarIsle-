/**
 * @file EmergencyHelpButton.tsx
 * @description 紧急求助悬浮按钮组件，全局固定在右下角，点击弹出心理危机援助热线列表
 * @module web-frontend/components/common
 */
import { useState } from 'react';
import { Siren, X, Phone } from 'lucide-react';

/**
 * 预置心理危机援助热线列表
 */
const HOTLINES = [
  { name: '12355 青少年服务热线', number: '12355', desc: '青少年心理咨询与危机干预' }, // 全国青少年公益热线
  { name: '希望24热线', number: '400-161-9995', desc: '24小时心理危机干预热线' }, // 全天候心理援助
  { name: '北京心理危机干预中心', number: '010-82951332', desc: '专业心理危机干预' }, // 北京本地专业机构
];

/**
 * 紧急求助悬浮按钮组件
 * @returns JSX 元素：包含右下角浮动按钮与点击后的弹窗
 */
export function EmergencyHelpButton() {
  // 控制弹窗显隐
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 浮动按钮：固定右下角，红色高亮 + 脉冲动画引导注意 */}
      <button
        onClick={() => setOpen(true)}
        aria-label="紧急帮助"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-105"
      >
        <Siren className="w-6 h-6" />
        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20 pointer-events-none" />
      </button>

      {/* 弹窗：遮罩点击关闭，内部阻止冒泡避免误关 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Siren className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">紧急帮助</h3>
                  <p className="text-xs text-red-100">您不是一个人在面对</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">
                如果您或孩子正处于危机情况，请立即拨打以下热线获取专业支持：
              </p>
              {/* 热线列表：每项为 tel: 链接，点击直接唤起拨号 */}
              <div className="space-y-3">
                {HOTLINES.map((h) => (
                  <a
                    key={h.number}
                    href={`tel:${h.number}`}
                    className="flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 rounded-xl border border-red-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{h.name}</p>
                      <p className="text-xs text-gray-500 truncate">{h.desc}</p>
                    </div>
                    <span className="text-base font-bold text-red-600">{h.number}</span>
                  </a>
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-400 text-center">
                如遇生命危险，请立即拨打 120 或 110
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
