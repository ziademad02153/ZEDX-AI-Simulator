import { SUPPORTED_LANGUAGES } from './languages';

export function resolveWebInterviewLanguage(stateLanguage: string, savedLanguage: string | null, hasSessionContext: boolean): string {
    const candidates = hasSessionContext ? [stateLanguage, savedLanguage] : [savedLanguage, stateLanguage];
    return candidates.find(code => SUPPORTED_LANGUAGES.some(language => language.code === code?.trim()))?.trim() || 'en-US';
}

export function getWebSpeechProvider(language: string): 'elevenlabs' | 'web-speech' {
    return language === 'ar-EG' || language === 'ar-SA' ? 'elevenlabs' : 'web-speech';
}

export function selectWebSpeechVoice<T extends { lang: string; name: string }>(voices: T[], language: string): T | undefined {
    const normalize = (value: string) => value.toLowerCase().replaceAll('_', '-');
    const target = normalize(language);
    const sameLanguage = (voice: T) => {
        const code = normalize(voice.lang);
        return code.split('-')[0] === target.split('-')[0] || (target === 'fil-ph' && code.split('-')[0] === 'tl');
    };
    const exact = voices.filter(voice => normalize(voice.lang) === target);
    const candidates = exact.length ? exact : voices.filter(sameLanguage);
    return candidates.find(voice => /Natural|Online|Male|Daniel|Alex/i.test(voice.name)) || candidates[0];
}

export async function loadWebSpeechVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
    const current = synth.getVoices();
    if (current.length) return current;
    return new Promise(resolve => {
        const finish = () => {
            clearTimeout(timeout);
            synth.removeEventListener('voiceschanged', finish);
            resolve(synth.getVoices());
        };
        const timeout = setTimeout(finish, 2000);
        synth.addEventListener('voiceschanged', finish);
        // Handle voices loading between the initial read and listener registration.
        if (synth.getVoices().length) finish();
    });
}

// Spoken system messages belong to the selected session language too.
export const WEB_INTERVIEW_MESSAGES: Record<string, { completed: string; connectionError: string }> = {
    'en-US': { completed: 'The interview is complete. Generating your report...', connectionError: 'Connection lost. Please check your network and try again.' },
    'ar-EG': { completed: 'كده الانترفيو خلص. بنجهّز التقرير بتاعك...', connectionError: 'الاتصال اتقطع. اتأكد من النت وحاول تاني.' },
    'ar-SA': { completed: 'اكتملت المقابلة. جارٍ إعداد تقريرك...', connectionError: 'انقطع الاتصال. يُرجى التحقق من الشبكة والمحاولة مجددًا.' },
    'es-ES': { completed: 'La entrevista ha terminado. Estamos preparando tu informe...', connectionError: 'Se perdió la conexión. Comprueba tu red e inténtalo de nuevo.' },
    'fr-FR': { completed: 'L’entretien est terminé. Nous préparons votre rapport...', connectionError: 'Connexion perdue. Vérifiez votre réseau et réessayez.' },
    'de-DE': { completed: 'Das Interview ist abgeschlossen. Ihr Bericht wird erstellt...', connectionError: 'Verbindung unterbrochen. Prüfen Sie Ihr Netzwerk und versuchen Sie es erneut.' },
    'it-IT': { completed: 'Il colloquio è terminato. Stiamo preparando il tuo rapporto...', connectionError: 'Connessione interrotta. Controlla la rete e riprova.' },
    'pt-BR': { completed: 'A entrevista terminou. Estamos preparando seu relatório...', connectionError: 'A conexão foi perdida. Verifique sua rede e tente novamente.' },
    'zh-CN': { completed: '面试已结束。正在生成您的报告...', connectionError: '连接已断开。请检查网络后重试。' },
    'ja-JP': { completed: '面接が終了しました。レポートを作成しています...', connectionError: '接続が切れました。ネットワークを確認して再試行してください。' },
    'ko-KR': { completed: '면접이 끝났습니다. 보고서를 작성하고 있습니다...', connectionError: '연결이 끊겼습니다. 네트워크를 확인하고 다시 시도하세요.' },
    'hi-IN': { completed: 'साक्षात्कार पूरा हो गया है। आपकी रिपोर्ट तैयार की जा रही है...', connectionError: 'कनेक्शन टूट गया। नेटवर्क जाँचें और फिर से कोशिश करें।' },
    'tr-TR': { completed: 'Görüşme tamamlandı. Raporunuz hazırlanıyor...', connectionError: 'Bağlantı kesildi. Ağınızı kontrol edip tekrar deneyin.' },
    'nl-NL': { completed: 'Het interview is afgerond. Uw rapport wordt opgesteld...', connectionError: 'Verbinding verbroken. Controleer uw netwerk en probeer opnieuw.' },
    'ru-RU': { completed: 'Собеседование завершено. Ваш отчёт готовится...', connectionError: 'Соединение потеряно. Проверьте сеть и попробуйте снова.' },
    'id-ID': { completed: 'Wawancara selesai. Laporan Anda sedang disiapkan...', connectionError: 'Koneksi terputus. Periksa jaringan Anda dan coba lagi.' },
    'fil-PH': { completed: 'Tapos na ang panayam. Inihahanda ang iyong ulat...', connectionError: 'Naputol ang koneksyon. Suriin ang iyong network at subukang muli.' },
    'pl-PL': { completed: 'Rozmowa została zakończona. Przygotowujemy Twój raport...', connectionError: 'Połączenie zostało przerwane. Sprawdź sieć i spróbuj ponownie.' },
    'sv-SE': { completed: 'Intervjun är avslutad. Din rapport förbereds...', connectionError: 'Anslutningen bröts. Kontrollera nätverket och försök igen.' },
    'bg-BG': { completed: 'Интервюто приключи. Подготвяме Вашия доклад...', connectionError: 'Връзката е прекъсната. Проверете мрежата и опитайте отново.' },
    'ro-RO': { completed: 'Interviul s-a încheiat. Pregătim raportul dumneavoastră...', connectionError: 'Conexiunea s-a întrerupt. Verificați rețeaua și încercați din nou.' },
    'cs-CZ': { completed: 'Pohovor skončil. Připravujeme vaši zprávu...', connectionError: 'Spojení bylo přerušeno. Zkontrolujte síť a zkuste to znovu.' },
    'el-GR': { completed: 'Η συνέντευξη ολοκληρώθηκε. Ετοιμάζουμε την αναφορά σας...', connectionError: 'Η σύνδεση διακόπηκε. Ελέγξτε το δίκτυο και δοκιμάστε ξανά.' },
    'fi-FI': { completed: 'Haastattelu on päättynyt. Raporttiasi valmistellaan...', connectionError: 'Yhteys katkesi. Tarkista verkkoyhteys ja yritä uudelleen.' },
    'hr-HR': { completed: 'Intervju je završen. Pripremamo vaše izvješće...', connectionError: 'Veza je prekinuta. Provjerite mrežu i pokušajte ponovno.' },
    'ms-MY': { completed: 'Temu duga selesai. Laporan anda sedang disediakan...', connectionError: 'Sambungan terputus. Semak rangkaian anda dan cuba lagi.' },
    'sk-SK': { completed: 'Pohovor sa skončil. Pripravujeme vašu správu...', connectionError: 'Spojenie sa prerušilo. Skontrolujte sieť a skúste to znova.' },
    'da-DK': { completed: 'Interviewet er afsluttet. Din rapport bliver udarbejdet...', connectionError: 'Forbindelsen blev afbrudt. Tjek dit netværk, og prøv igen.' },
    'ta-IN': { completed: 'நேர்காணல் முடிந்தது. உங்கள் அறிக்கை தயாரிக்கப்படுகிறது...', connectionError: 'இணைப்பு துண்டிக்கப்பட்டது. இணையத்தைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.' },
    'uk-UA': { completed: 'Співбесіду завершено. Готуємо ваш звіт...', connectionError: 'З’єднання втрачено. Перевірте мережу та спробуйте знову.' },
};

export function getWebInterviewMessages(language: string) {
    return WEB_INTERVIEW_MESSAGES[language] || WEB_INTERVIEW_MESSAGES['en-US'];
}
