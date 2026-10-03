// Project detail pages are gone; send old links to the list.
export default defineEventHandler((event) => sendRedirect(event, "/projects", 301));
