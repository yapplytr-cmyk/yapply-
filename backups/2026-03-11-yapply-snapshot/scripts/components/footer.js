export function createFooter(content) {
  const footerColumns = content.footer.columns
    .map(
      (column) => `
        <div class="footer-card">
          <h3 class="footer-title">${column.title}</h3>
          <div class="footer-links">
            ${column.links.map((link) => `<a href="${link.href}">${link.label}</a>`).join("")}
          </div>
        </div>
      `
    )
    .join("");

  return `
    <footer class="footer section-shell" id="footer">
      <div class="panel footer-grid">
        <div>
          <h2 class="section-title">Yapply</h2>
          <p class="footer-copy">${content.footer.description}</p>
        </div>

        ${footerColumns}
      </div>

      <div class="footer-bottom">
        <span>${content.footer.contact}</span>
        <span class="footer-note">${content.footer.note}</span>
        <span>© <span data-current-year></span> ${content.footer.copyrightLabel}</span>
      </div>
    </footer>
  `;
}
