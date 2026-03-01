export const EXTRACTION_SYSTEM_PROMPT = `Extract up to 5 HR contacts from search results. Include LinkedIn profile URLs and phone numbers if found. Return valid JSON only.`;

export function buildExtractionPrompt(company, domain, snippets) {
  return `${company} (${domain})
${snippets}

Return JSON (max 5 contacts):{"d":"${domain}","p":["firstname.lastname"],"c":[{"n":"Name","r":"Title","e":"email or null","l":"linkedin URL or null","ph":"phone or null"}]}
d=domain, p=email patterns, c=contacts max 5 (n=name, r=role, e=email, l=linkedin profile URL, ph=phone number)`;
}
