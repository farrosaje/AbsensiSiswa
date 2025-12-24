<h1 align="center">📌 SISTEM ABSENSI RFID</h1>
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif"> 

---

## 📖 Deskripsi Proyek

Proyek ini adalah sistem absensi berbasis RFID menggunakan **ESP8266 (NodeMCU)**, di mana **satu kartu RFID master** digunakan untuk mencatat kehadiran **banyak siswa secara bergantian**.

Pemilihan siswa dilakukan melalui **Serial Monitor atau Web**, sehingga tidak diperlukan kartu RFID untuk setiap siswa.

Sistem ini cocok untuk:
- Sekolah dengan keterbatasan kartu RFID  
- Absensi bergilir (praktikum, les, laboratorium)  
- Sistem absensi yang terintegrasi dengan web
<h1 align="center">🎯 Fitur Utama</h1>
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif"> 


1. ✅ 1 kartu master untuk semua siswa
2. ✅ Multi siswa (hingga 50 siswa)
3. ✅ Pilih siswa aktif via Serial / Web
4. ✅ LCD 16x2 I2C sebagai tampilan
5. ✅ Buzzer notifikasi (berhasil / gagal)
6. ✅ Data tersimpan di EEPROM (tidak hilang saat restart)
7. ✅ Log absensi hingga 100 data
8. ✅ Mode sistem lengkap (Normal, Register, Set Master)
9. ✅ Kompatibel integrasi Web / IoT
