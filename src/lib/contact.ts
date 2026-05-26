export const WHATSAPP_PHONE = "15997705571";

export const WHATSAPP_MESSAGE =
  "Olá! Vim pelo site e gostaria de uma análise da minha situação fiscal. Sou brasileiro(a) morando no exterior.";

export const WHATSAPP_LINK = `https://api.whatsapp.com/send/?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
