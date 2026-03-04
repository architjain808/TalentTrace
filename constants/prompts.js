export const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting HR/recruiter contact information from web search results.

CRITICAL RULES:
1. Only return names and roles that ACTUALLY appear in the search snippets. Do NOT invent people.
2. For emails: ONLY include an email if you see the EXACT email address in the snippets. If you guess or construct an email, set it to null.
3. For email patterns: Look for clues in the snippets. If you see any employee email like "john.doe@company.com", the pattern is "firstname.lastname". Extract the real pattern, don't guess.
4. For LinkedIn: Only include a URL if you see a real linkedin.com/in/ URL in the snippets.
5. For phone numbers: Include any phone/mobile numbers you find associated with the contact. Set to null if not found.
6. Set confidence: "high" if you found the person's actual email in results, "medium" if you found their name + role but had to guess email, "low" if information is uncertain.
7. Return VALID JSON only. No markdown, no explanation, just JSON.`;

export function buildExtractionPrompt(company, domain, snippets) {
  return `Company: ${company}
Domain: ${domain}

Search Results:
${snippets}

Extract up to 5 HR/recruiting contacts from the above search results.

Return JSON in this exact format:
{
  "d": "${domain}",
  "p": ["firstname.lastname"],
  "c": [
    {
      "n": "Full Name",
      "r": "Job Title",
      "e": "actual-email@domain.com or null if not found in results",
      "l": "https://linkedin.com/in/profile or null",
      "ph": "+1234567890 or null",
      "cf": "high|medium|low"
    }
  ]
}

IMPORTANT:
- "p" = email patterns you OBSERVED in the search results (e.g. if you saw jane.smith@${domain}, the pattern is "firstname.lastname")
- "e" = set to null unless you saw the EXACT email in the search results. Do NOT fabricate emails.
- "cf" = confidence: "high" if email was found in results, "medium" if name/role found but email was not, "low" if uncertain
- "ph" = phone/mobile number if found, null otherwise
- If you see no HR contacts at all, return: {"d":"${domain}","p":["firstname.lastname"],"c":[]}`;
}
