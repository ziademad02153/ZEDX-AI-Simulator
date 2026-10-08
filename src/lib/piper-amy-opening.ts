export function getAmyOpeningText(name = ''): string {
    const firstName = name.trim().split(/\s+/)[0].slice(0, 50);
    return `Welcome${firstName ? `, ${firstName}` : ''}, I am ZEDX. I will be conducting your interview today. Could you please start by introducing yourself and telling me a little bit about your background?`;
}

export const AMY_OPENING_TEXT = getAmyOpeningText();
