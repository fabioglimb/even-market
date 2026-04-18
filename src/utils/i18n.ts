export type MarketLanguage = 'en' | 'it' | 'es' | 'fr' | 'de' | 'pt' | 'ja' | 'zh' | 'ko' | 'ru'

export const MARKET_LANGUAGES: { id: MarketLanguage; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'it', name: 'Italiano' },
  { id: 'es', name: 'Espanol' },
  { id: 'fr', name: 'Francais' },
  { id: 'de', name: 'Deutsch' },
  { id: 'pt', name: 'Portugues' },
  { id: 'ja', name: '日本語' },
  { id: 'zh', name: '中文' },
  { id: 'ko', name: '한국어' },
  { id: 'ru', name: 'Русский' },
]

const translations: Record<string, Record<MarketLanguage, string>> = {
  // Home
  'home.watchlist': {
    en: 'Watchlist', it: 'Lista', es: 'Lista', fr: 'Liste', de: 'Watchlist',
    pt: 'Lista', ja: 'ウォッチリスト', zh: '自选', ko: '관심목록', ru: 'Список',
  },
  'home.settings': {
    en: 'Settings', it: 'Impostazioni', es: 'Ajustes', fr: 'Parametres', de: 'Einstellungen',
    pt: 'Configuracoes', ja: '設定', zh: '设置', ko: '설정', ru: 'Настройки',
  },

  // Watchlist columns
  'watchlist.symbol': {
    en: 'SYMBOL', it: 'SIMBOLO', es: 'SIMBOLO', fr: 'SYMBOLE', de: 'SYMBOL',
    pt: 'SIMBOLO', ja: '銘柄', zh: '代码', ko: '종목', ru: 'СИМВОЛ',
  },
  'watchlist.price': {
    en: 'PRICE', it: 'PREZZO', es: 'PRECIO', fr: 'PRIX', de: 'PREIS',
    pt: 'PRECO', ja: '価格', zh: '价格', ko: '가격', ru: 'ЦЕНА',
  },
  'watchlist.change': {
    en: 'CHANGE', it: 'VARIAZIONE', es: 'CAMBIO', fr: 'VARIATION', de: 'ANDERUNG',
    pt: 'VARIACAO', ja: '変動', zh: '涨跌', ko: '변동', ru: 'ИЗМЕНЕНИЕ',
  },

  // Settings
  'settings.title': {
    en: 'SETTINGS', it: 'IMPOSTAZIONI', es: 'AJUSTES', fr: 'PARAMETRES', de: 'EINSTELLUNGEN',
    pt: 'CONFIGURACOES', ja: '設定', zh: '设置', ko: '설정', ru: 'НАСТРОЙКИ',
  },
  'settings.refresh': {
    en: 'Refresh', it: 'Aggiorna', es: 'Actualizar', fr: 'Actualiser', de: 'Aktualisieren',
    pt: 'Atualizar', ja: '更新', zh: '刷新', ko: '새로고침', ru: 'Обновление',
  },
  'settings.chart': {
    en: 'Chart', it: 'Grafico', es: 'Grafico', fr: 'Graphique', de: 'Diagramm',
    pt: 'Grafico', ja: 'チャート', zh: '图表', ko: '차트', ru: 'График',
  },
  'settings.sparkline': {
    en: 'Sparkline', it: 'Sparkline', es: 'Sparkline', fr: 'Sparkline', de: 'Sparkline',
    pt: 'Sparkline', ja: 'スパークライン', zh: '迷你图', ko: '스파크라인', ru: 'Спарклайн',
  },
  'settings.candles': {
    en: 'Candles', it: 'Candele', es: 'Velas', fr: 'Bougies', de: 'Kerzen',
    pt: 'Velas', ja: 'ローソク', zh: '蜡烛图', ko: '캔들', ru: 'Свечи',
  },
  'settings.language': {
    en: 'Language', it: 'Lingua', es: 'Idioma', fr: 'Langue', de: 'Sprache',
    pt: 'Idioma', ja: '言語', zh: '语言', ko: '언어', ru: 'Язык',
  },

  // Chart
  'chart.nav': {
    en: 'NAV', it: 'NAV', es: 'NAV', fr: 'NAV', de: 'NAV',
    pt: 'NAV', ja: 'NAV', zh: '导航', ko: '탐색', ru: 'НАВ',
  },
  'chart.noGraphic': {
    en: 'No graphic', it: 'Nessun grafico', es: 'Sin grafico', fr: 'Pas de graphique', de: 'Keine Grafik',
    pt: 'Sem grafico', ja: 'グラフなし', zh: '无图表', ko: '그래픽 없음', ru: 'Нет графика',
  },
  'chart.noData': {
    en: 'No candle data', it: 'Nessun dato', es: 'Sin datos', fr: 'Pas de donnees', de: 'Keine Daten',
    pt: 'Sem dados', ja: 'データなし', zh: '无数据', ko: '데이터 없음', ru: 'Нет данных',
  },
  'chart.loading': {
    en: 'Loading...', it: 'Caricamento...', es: 'Cargando...', fr: 'Chargement...', de: 'Laden...',
    pt: 'Carregando...', ja: '読み込み中...', zh: '加载中...', ko: '로딩...', ru: 'Загрузка...',
  },

  // Web UI
  'web.title': {
    en: 'ER Market', it: 'ER Market', es: 'ER Market', fr: 'ER Market', de: 'ER Market',
    pt: 'ER Market', ja: 'ER Market', zh: 'ER Market', ko: 'ER Market', ru: 'ER Market',
  },
  'web.subtitle': {
    en: 'Real-time market data on your glasses',
    it: 'Dati di mercato in tempo reale sui tuoi occhiali',
    es: 'Datos de mercado en tiempo real en tus gafas',
    fr: 'Donnees de marche en temps reel sur vos lunettes',
    de: 'Echtzeit-Marktdaten auf Ihrer Brille',
    pt: 'Dados de mercado em tempo real nos seus oculos',
    ja: 'メガネでリアルタイム市場データ',
    zh: '眼镜上的实时市场数据',
    ko: '안경으로 실시간 시장 데이터',
    ru: 'Рыночные данные в реальном времени на ваших очках',
  },
  'web.watchlist': {
    en: 'Watchlist', it: 'Lista', es: 'Lista', fr: 'Liste', de: 'Watchlist',
    pt: 'Lista', ja: 'ウォッチリスト', zh: '自选', ko: '관심목록', ru: 'Список',
  },
  'web.settings': {
    en: 'Settings', it: 'Impostazioni', es: 'Ajustes', fr: 'Parametres', de: 'Einstellungen',
    pt: 'Configuracoes', ja: '設定', zh: '设置', ko: '설정', ru: 'Настройки',
  },
  'web.marketSection': {
    en: 'Market', it: 'Mercato', es: 'Mercado', fr: 'Marche', de: 'Markt',
    pt: 'Mercado', ja: '市場', zh: '市场', ko: '시장', ru: 'Рынок',
  },
  'web.overview': {
    en: 'Overview', it: 'Panoramica', es: 'Resumen', fr: 'Apercu', de: 'Ubersicht',
    pt: 'Visao geral', ja: '概要', zh: '概览', ko: '개요', ru: 'Обзор',
  },
  'web.portfolio': {
    en: 'Portfolio', it: 'Portafoglio', es: 'Cartera', fr: 'Portefeuille', de: 'Portfolio',
    pt: 'Portfolio', ja: 'ポートフォリオ', zh: '投资组合', ko: '포트폴리오', ru: 'Портфель',
  },
  'web.alerts': {
    en: 'Alerts', it: 'Avvisi', es: 'Alertas', fr: 'Alertes', de: 'Warnungen',
    pt: 'Alertas', ja: 'アラート', zh: '提醒', ko: '알림', ru: 'Оповещения',
  },
  'web.news': {
    en: 'News', it: 'Notizie', es: 'Noticias', fr: 'Actualites', de: 'Nachrichten',
    pt: 'Noticias', ja: 'ニュース', zh: '新闻', ko: '뉴스', ru: 'Новости',
  },
  'web.stock': {
    en: 'Stock', it: 'Titolo', es: 'Accion', fr: 'Titre', de: 'Aktie',
    pt: 'Acao', ja: '銘柄', zh: '股票', ko: '종목', ru: 'Акция',
  },
  'web.holding': {
    en: 'Holding', it: 'Posizione', es: 'Posicion', fr: 'Position', de: 'Position',
    pt: 'Posicao', ja: '保有', zh: '持仓', ko: '보유', ru: 'Позиция',
  },
  'web.addHolding': {
    en: 'Add Holding', it: 'Aggiungi posizione', es: 'Agregar posicion', fr: 'Ajouter position', de: 'Position hinzufugen',
    pt: 'Adicionar posicao', ja: '保有を追加', zh: '添加持仓', ko: '보유 추가', ru: 'Добавить позицию',
  },
  'web.article': {
    en: 'Article', it: 'Articolo', es: 'Articulo', fr: 'Article', de: 'Artikel',
    pt: 'Artigo', ja: '記事', zh: '文章', ko: '기사', ru: 'Статья',
  },
  'web.howItWorks': {
    en: 'How It Works', it: 'Come Funziona', es: 'Como Funciona', fr: 'Comment ca marche', de: 'So funktioniert es',
    pt: 'Como Funciona', ja: '使い方', zh: '使用方法', ko: '사용 방법', ru: 'Как это работает',
  },
  'web.refreshInterval': {
    en: 'Refresh Interval', it: 'Intervallo aggiornamento', es: 'Intervalo de actualizacion', fr: 'Intervalle de rafraichissement', de: 'Aktualisierungsintervall',
    pt: 'Intervalo de atualizacao', ja: '更新間隔', zh: '刷新间隔', ko: '새로고침 간격', ru: 'Интервал обновления',
  },
  'web.chartType': {
    en: 'Glass Chart Type', it: 'Tipo grafico occhiali', es: 'Tipo de grafico', fr: 'Type de graphique', de: 'Diagrammtyp',
    pt: 'Tipo de grafico', ja: 'グラスチャートタイプ', zh: '眼镜图表类型', ko: '안경 차트 유형', ru: 'Тип графика',
  },
  'web.connectionStatus': {
    en: 'Connection Status', it: 'Stato connessione', es: 'Estado de conexion', fr: 'Etat de connexion', de: 'Verbindungsstatus',
    pt: 'Estado da conexao', ja: '接続状態', zh: '连接状态', ko: '연결 상태', ru: 'Статус подключения',
  },
  'web.back': {
    en: 'Back', it: 'Indietro', es: 'Atras', fr: 'Retour', de: 'Zuruck',
    pt: 'Voltar', ja: '戻る', zh: '返回', ko: '뒤로', ru: 'Назад',
  },
  'web.symbolPlaceholder': {
    en: 'Symbol (e.g. AMZN)', it: 'Simbolo (es. AMZN)', es: 'Simbolo (ej. AMZN)', fr: 'Symbole (ex. AMZN)', de: 'Symbol (z.B. AMZN)',
    pt: 'Simbolo (ex. AMZN)', ja: '銘柄 (例: AMZN)', zh: '代码 (如 AMZN)', ko: '종목 (예: AMZN)', ru: 'Символ (напр. AMZN)',
  },
}

export function t(key: string, lang: MarketLanguage): string {
  return translations[key]?.[lang] ?? translations[key]?.['en'] ?? key
}

export function getLanguageName(lang: MarketLanguage): string {
  const entry = MARKET_LANGUAGES.find(l => l.id === lang)
  return entry?.name ?? lang
}
