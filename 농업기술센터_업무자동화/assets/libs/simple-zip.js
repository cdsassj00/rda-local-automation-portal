/**
 * 순수 JavaScript 무의존성 경량 ZIP 생성기 (Local Store 방식)
 * 외부 인터넷이나 CDN 없이 브라우저 오프라인 환경에서 다중 파일 압축 다운로드를 지원합니다.
 * PKZip 2.0 표준 스펙 준수 (Store 무압축 모드 - 빠르고 CPU 부하 없음)
 */

class SimpleZip {
  constructor() {
    this.files = [];
  }

  /**
   * 파일 추가
   * @param {string} filename 파일명 (예: "사진_001.jpg")
   * @param {Uint8Array|ArrayBuffer|Blob|string} data 파일 내용
   */
  async addFile(filename, data) {
    let uint8;
    if (data instanceof Uint8Array) {
      uint8 = data;
    } else if (data instanceof ArrayBuffer) {
      uint8 = new Uint8Array(data);
    } else if (typeof Blob !== 'undefined' && data instanceof Blob) {
      const buffer = await data.arrayBuffer();
      uint8 = new Uint8Array(buffer);
    } else if (typeof data === 'string') {
      const encoder = new TextEncoder();
      uint8 = encoder.encode(data);
    } else {
      throw new Error('지원하지 않는 데이터 형식입니다.');
    }

    const utf8Name = new TextEncoder().encode(filename);
    const crc = SimpleZip.crc32(uint8);

    this.files.push({
      name: filename,
      rawName: utf8Name,
      data: uint8,
      crc: crc,
      size: uint8.length,
      date: new Date()
    });
  }

  /**
   * ZIP 파일 바이너리 생성 (Blob 반환)
   * @returns {Blob}
   */
  generateZipBlob() {
    let localHeadersSize = 0;
    let centralDirSize = 0;

    // 크기 계산
    for (const f of this.files) {
      localHeadersSize += 30 + f.rawName.length + f.size;
      centralDirSize += 46 + f.rawName.length;
    }

    const totalSize = localHeadersSize + centralDirSize + 22;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    let offset = 0;
    const centralDirOffsets = [];

    // 1. Local File Headers & File Data
    for (const f of this.files) {
      centralDirOffsets.push(offset);

      // Signature: 0x04034b50
      view.setUint32(offset, 0x04034b50, true);
      view.setUint16(offset + 4, 20, true); // Version needed (2.0)
      view.setUint16(offset + 6, 0x0800, true); // General purpose bit flag (Bit 11 = UTF-8)
      view.setUint16(offset + 8, 0, true); // Compression method (0 = Store)
      
      const { dosTime, dosDate } = SimpleZip.getDosDateTime(f.date);
      view.setUint16(offset + 10, dosTime, true);
      view.setUint16(offset + 12, dosDate, true);
      view.setUint32(offset + 14, f.crc, true); // CRC-32
      view.setUint32(offset + 18, f.size, true); // Compressed size
      view.setUint32(offset + 22, f.size, true); // Uncompressed size
      view.setUint16(offset + 26, f.rawName.length, true); // File name length
      view.setUint16(offset + 28, 0, true); // Extra field length

      offset += 30;
      bytes.set(f.rawName, offset);
      offset += f.rawName.length;

      bytes.set(f.data, offset);
      offset += f.size;
    }

    const centralDirStartOffset = offset;

    // 2. Central Directory Headers
    for (let i = 0; i < this.files.length; i++) {
      const f = this.files[i];
      const localOffset = centralDirOffsets[i];

      // Signature: 0x02014b50
      view.setUint32(offset, 0x02014b50, true);
      view.setUint16(offset + 4, 20, true); // Version made by
      view.setUint16(offset + 6, 20, true); // Version needed
      view.setUint16(offset + 8, 0x0800, true); // Bit 11 = UTF-8
      view.setUint16(offset + 10, 0, true); // Compression method (Store)

      const { dosTime, dosDate } = SimpleZip.getDosDateTime(f.date);
      view.setUint16(offset + 12, dosTime, true);
      view.setUint16(offset + 14, dosDate, true);
      view.setUint32(offset + 16, f.crc, true);
      view.setUint32(offset + 20, f.size, true);
      view.setUint32(offset + 24, f.size, true);
      view.setUint16(offset + 28, f.rawName.length, true);
      view.setUint16(offset + 30, 0, true); // Extra field length
      view.setUint16(offset + 32, 0, true); // File comment length
      view.setUint16(offset + 34, 0, true); // Disk number start
      view.setUint16(offset + 36, 0, true); // Internal file attributes
      view.setUint32(offset + 38, 0, true); // External file attributes
      view.setUint32(offset + 42, localOffset, true); // Relative offset of local header

      offset += 46;
      bytes.set(f.rawName, offset);
      offset += f.rawName.length;
    }

    const centralDirEndOffset = offset;
    const actualCentralDirSize = centralDirEndOffset - centralDirStartOffset;

    // 3. End of Central Directory Record
    // Signature: 0x06054b50
    view.setUint32(offset, 0x06054b50, true);
    view.setUint16(offset + 4, 0, true); // Disk number
    view.setUint16(offset + 6, 0, true); // Disk number with central dir
    view.setUint16(offset + 8, this.files.length, true); // Total entries disk
    view.setUint16(offset + 10, this.files.length, true); // Total entries central
    view.setUint32(offset + 12, actualCentralDirSize, true); // Size of central dir
    view.setUint32(offset + 16, centralDirStartOffset, true); // Offset of start
    view.setUint16(offset + 20, 0, true); // Comment length

    return new Blob([buffer], { type: 'application/zip' });
  }

  // DOS Date/Time 변환
  static getDosDateTime(date) {
    const d = date || new Date();
    const year = d.getFullYear();
    const dosYear = year < 1980 ? 0 : year - 1980;
    const dosMonth = d.getMonth() + 1;
    const dosDay = d.getDate();
    const dosHours = d.getHours();
    const dosMinutes = d.getMinutes();
    const dosSeconds = Math.floor(d.getSeconds() / 2);

    const dosDate = (dosYear << 9) | (dosMonth << 5) | dosDay;
    const dosTime = (dosHours << 11) | (dosMinutes << 5) | dosSeconds;

    return { dosDate, dosTime };
  }

  // CRC-32 계산 (하드코딩 테이블로 고속 계산)
  static crc32(uint8) {
    if (!SimpleZip._crcTable) {
      const table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
          c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
      }
      SimpleZip._crcTable = table;
    }

    let crc = 0xffffffff;
    const table = SimpleZip._crcTable;
    for (let i = 0; i < uint8.length; i++) {
      crc = table[(crc ^ uint8[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}

window.SimpleZip = SimpleZip;
