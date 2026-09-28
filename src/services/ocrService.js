import { timeMinutes } from '../utils/dates';
import { DAYS } from '../constants/days';

export const OCRService = {
  /**
   * İzmir Ekonomi Üniversitesi (OBS) ve standart üniversite OBS tablolarını akıllıca çözen parser
   */
  parseTimetableText(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];

    // Metni satırlara böl
    const lines = rawText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 1);

    const rawCourses = [];
    let currentDayId = 1;

    // Gün yakalama
    const dayMap = [
      { id: 1, regex: /\bpazartesi\b|\bpzt\b/i },
      { id: 2, regex: /sal[ıi]/i },
      { id: 3, regex: /[çc]ar[sş]amba/i },
      { id: 4, regex: /per[sş]embe|\bper\b/i },
      { id: 6, regex: /cumartesi|cmt/i },
      { id: 0, regex: /\bpazar\b/i },
      { id: 5, regex: /\bcuma\b|\bcum\b/i },
    ];

    // OBS Saat formatı: 08:30-09:15 veya 08:30 - 09:15
    const timeRegex = /(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/;
    // OBS Ders Kodu formatı: GER 202(2), SE 216(3), MATH 240(1), CE 223(2), ENG 210(2), vb.
    const obsCourseCodeRegex = /\b([A-ZÇĞİÖŞÜ]{2,5})\s*[-_]?\s*(\d{3,4})(?:\((\d+)\))?\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Gün değişimi
      for (const d of dayMap) {
        if (d.regex.test(line)) {
          currentDayId = d.id;
          break;
        }
      }

      // Saat yakala
      const timeMatch = line.match(timeRegex);
      const codeMatch = line.match(obsCourseCodeRegex);

      if (timeMatch && codeMatch) {
        const startTime = timeMatch[1].replace('.', ':');
        const endTime = timeMatch[2].replace('.', ':');
        const code = `${codeMatch[1].toUpperCase()} ${codeMatch[2]}`;

        // Ders adını temizle
        let name = line
          .replace(timeMatch[0], '')
          .replace(codeMatch[0], '')
          .replace(/\[\d+\]/g, '') // [24], [45] gibi kapasiteleri sil
          .replace(/[A-Z]\s*\d{3}/g, '') // E 203 gibi derslikleri sil
          .replace(/Dr\..*|Prof\..*|Öğr\..*/i, '') // Hoca adlarını ders adından ayır
          .trim();

        name = name.replace(/^[–\-:\s|]+|[–\-:\s|]+$/g, '');

        if (!name || name.length < 2) {
          // Bir sonraki satıra bak
          if (i + 1 < lines.length && !lines[i + 1].match(timeRegex)) {
            name = lines[i + 1].replace(/Dr\..*|Prof\..*|Öğr\..*/i, '').trim();
          } else {
            name = code + ' Dersi';
          }
        }

        // Derslik
        const roomMatch = line.match(/\b([A-Z]\s*\d{3}|ML\s*\d{3}|M\s*\d{2,3})\b/i);
        const room = roomMatch ? roomMatch[0].toUpperCase() : 'Derslik';

        rawCourses.push({
          day: currentDayId,
          code,
          name: name.trim(),
          startTime: startTime.length === 4 ? '0' + startTime : startTime,
          endTime: endTime.length === 4 ? '0' + endTime : endTime,
          room
        });
      }
    }

    // ARDIŞIK DERSLERİ BİRLEŞTİR (Örn: 08:30-09:15 ve 09:25-10:10 aynı ders ise tek ders yap: 08:30 - 10:10)
    return this.mergeConsecutiveCourseBlocks(rawCourses);
  },

  /**
   * OBS'deki 45 dakikalık ardışık blokları tek bir ders olarak birleştirir (çakışmayı önler)
   */
  mergeConsecutiveCourseBlocks(courses) {
    if (!courses || courses.length === 0) return [];

    const merged = [];

    // Gün ve saate göre sırala
    const sorted = [...courses].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.startTime.localeCompare(b.startTime);
    });

    for (const c of sorted) {
      // Önceki birleştirilmiş derse bak: Aynı gün, aynı kod ve saatler bitişik mi?
      const last = merged[merged.length - 1];

      const duration = timeMinutes(c.endTime) - timeMinutes(c.startTime);
      if (duration <= 0) throw new Error('OCR geçersiz bir saat aralığı okudu. Metni düzeltin.');
      const hours = Math.max(1, Math.round((duration + 10) / 55));
      const gap = last ? timeMinutes(c.startTime) - timeMinutes(last.endTime) : -1;
      if (last && last.day === c.day && last.code === c.code && gap >= 0 && gap <= 20) {
        // Blokları birleştir: başlangıç saati korunur, bitiş saati güncellenir, saat sayısı artar
        last.endTime = c.endTime;
        last.totalHoursWeekly = last.totalHoursWeekly + hours;
        last.maxAbsenceHours = last.totalHoursWeekly * 4; // %30 sınır
      } else {
        merged.push({
          id: 'ocr-' + Date.now() + '-' + merged.length,
          code: c.code,
          name: c.name,
          day: c.day,
          startTime: c.startTime,
          endTime: c.endTime,
          room: c.room,
          totalHoursWeekly: hours,
          maxAbsenceHours: hours * 4,
          selected: true
        });
      }
    }

    return merged;
  },

};
