/**
 * Safe XML Parser (SEC-02 Hardening)
 * Defends against XML External Entity (XXE), XML Bomb (Billion Laughs / Quadratic Blowup),
 * and unauthorized DTD entity expansions.
 * Complies with OWASP MASVS-CODE & CWE-611 / CWE-776.
 */

const MAX_SAFE_XML_SIZE = 10 * 1024 * 1024; // 10 MB limit
const MAX_XML_DEPTH = 64; // Max nesting levels

export interface SafeCalDavEventEntry {
  href: string;
  etag: string;
  status: string;
  calendarData?: string;
}

/**
 * Validates and safely parses an XML string into a DOM Document.
 * Throws SecurityError if malicious DTD or entity declarations are present.
 */
export function parseSafeXml(rawXml: string): Document {
  if (!rawXml || typeof rawXml !== 'string') {
    throw new Error('Pusty ładunek XML.');
  }

  // 1. Size restriction (Denial of Service prevention)
  if (rawXml.length > MAX_SAFE_XML_SIZE) {
    throw new Error(`Przekroczono maksymalny dozwolony rozmiar pliku XML (${MAX_SAFE_XML_SIZE} B).`);
  }

  // 2. Pre-scan for malicious DTD and Entity Expansion definitions
  const dangerousPatterns = [
    /<!DOCTYPE/i,
    /<!ENTITY/i,
    /SYSTEM\s+["']/i,
    /PUBLIC\s+["']/i,
    /<!\[CDATA\[.*<!ENTITY/is,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(rawXml)) {
      throw new Error(
        'Wykryto potencjalnie niebezpieczną deklarację DTD/ENTITY (ochrona przed XXE/Billion Laughs).'
      );
    }
  }

  // 3. Parse via browser DOMParser (which does not resolve external entities in modern browsers)
  if (typeof DOMParser === 'undefined') {
    throw new Error('Środowisko nie obsługuje DOMParser.');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawXml, 'application/xml');

  // Check for parser errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Błąd składni XML: ${parseError.textContent?.slice(0, 150)}`);
  }

  // 4. Validate nesting depth
  checkXmlNestingDepth(doc.documentElement, 1);

  return doc;
}

/**
 * Ensures tree depth does not exceed safe recursion threshold
 */
function checkXmlNestingDepth(element: Element, currentDepth: number): void {
  if (currentDepth > MAX_XML_DEPTH) {
    throw new Error(`Przekroczono maksymalną głębokość zagnieżdżenia XML (${MAX_XML_DEPTH}).`);
  }
  for (let i = 0; i < element.children.length; i++) {
    checkXmlNestingDepth(element.children[i], currentDepth + 1);
  }
}

/**
 * Safely parses CalDAV multistatus XML response and extracts events with ETags
 */
export function parseCalDavMultiStatusResponse(xmlContent: string): SafeCalDavEventEntry[] {
  const doc = parseSafeXml(xmlContent);
  const entries: SafeCalDavEventEntry[] = [];

  // Support both standard namespaced ('d:response', 'response')
  const responseNodes = Array.from(doc.getElementsByTagName('*')).filter((el) =>
    el.localName.toLowerCase() === 'response'
  );

  for (const resp of responseNodes) {
    let href = '';
    let etag = '';
    let status = '';
    let calendarData = '';

    const hrefEl = Array.from(resp.getElementsByTagName('*')).find(
      (el) => el.localName.toLowerCase() === 'href'
    );
    if (hrefEl) href = hrefEl.textContent?.trim() || '';

    const statusEl = Array.from(resp.getElementsByTagName('*')).find(
      (el) => el.localName.toLowerCase() === 'status'
    );
    if (statusEl) status = statusEl.textContent?.trim() || '';

    const getetagEl = Array.from(resp.getElementsByTagName('*')).find(
      (el) => el.localName.toLowerCase() === 'getetag'
    );
    if (getetagEl) {
      etag = (getetagEl.textContent?.trim() || '').replace(/^"|"$/g, '');
    }

    const calDataEl = Array.from(resp.getElementsByTagName('*')).find(
      (el) => el.localName.toLowerCase() === 'calendar-data'
    );
    if (calDataEl) calendarData = calDataEl.textContent?.trim() || '';

    if (href || calendarData) {
      entries.push({
        href,
        etag,
        status,
        calendarData,
      });
    }
  }

  return entries;
}

/**
 * Escapes XML strings to prevent XML Injection
 */
export function escapeXmlString(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
