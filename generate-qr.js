const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 로컬 IP 자동 감지 (같은 와이파이의 폰에서 접속 가능)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const BASE_URL = process.argv[2] || `http://${getLocalIP()}:3000`;

const QR_LIST = [
  {
    file: 'qr-normal.png',
    label: 'GS25편의점 (정상 결제)',
    path: '/payment?merchant=GS25편의점&amount=15800&category=Food&reason=점심식대',
  },
  {
    file: 'qr-blocked.png',
    label: '스타벅스 (한도 초과)',
    path: '/payment?merchant=스타벅스&amount=500000&category=Entertainment&reason=팀회식',
  },
];

const outDir = path.join(__dirname, 'public', 'qr');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  console.log(`Base URL: ${BASE_URL}\n`);

  for (const item of QR_LIST) {
    const url = BASE_URL + item.path;
    const outPath = path.join(outDir, item.file);

    await QRCode.toFile(outPath, url, {
      width: 400,
      margin: 2,
      color: { dark: '#111827', light: '#FFFFFF' },
    });

    console.log(`✓ ${item.label}`);
    console.log(`  파일: public/qr/${item.file}`);
    console.log(`  URL : ${url}\n`);
  }

  console.log('완료! public/qr/ 폴더를 확인하세요.');
  console.log('(Base URL 변경: node generate-qr.js http://192.168.x.x:3000)');
})();
