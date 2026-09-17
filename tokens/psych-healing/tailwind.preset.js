/* tailwind.preset.js — psych-healing 疗愈色板 Tailwind 预设 (CommonJS) */
module.exports = {
  theme: {
    extend: {
      colors: {
        heal: {
          cream: { 100: '#FBF5EA' },
          green: { 600: '#3C765C', 800: '#264F3D' },
          pink: { 200: '#F5DAD4' },
          blue: { 300: '#BBD6E0' },
          warn: { orange: { 400: '#D48A3C' } },
          danger: { red: { 500: '#B93232' } },
          ink: { gray: { 900: '#2C2C2C' } }
        }
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '20px'
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px'
      }
    }
  }
};

/* 自检：当直接 node 执行时输出 TOKENS_OK / FAIL */
if (require.main === module) {
  const p = require('./tailwind.preset.js');
  console.log(p.theme.extend.colors.heal.green[600] === '#3C765C' ? 'TOKENS_OK' : 'FAIL');
}
