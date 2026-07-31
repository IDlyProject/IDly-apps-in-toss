export function resolveCardNews(message) {
  const news = message.metadata?.cardNews;
  if (!news) return null;

  return {
    text: news.text,
    linkLabel: news.linkLabel ?? "카드뉴스",
    href: news.href ?? "#",
  };
}
