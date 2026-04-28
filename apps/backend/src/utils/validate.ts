import parsePhoneNumber, { isValidPhoneNumber } from "libphonenumber-js";
import { logger } from "./logger";
import { brazil, checkVAT } from "jsvat";

export const validatePhone = (
  phone: string,
  defaultCountry: "BR" = "BR"
): string | false => {
  if (!phone || !isValidPhoneNumber(phone, defaultCountry)) {
    logger.error(`[Validate Phone] - Invalid phone number: ${phone}`);
    return false;
  }
  const parsed = parsePhoneNumber(phone, defaultCountry);
  if (!parsed?.isValid()) {
    logger.error(`[Validate Phone] - Invalid phone number: ${phone}`);
    return false;
  }
  return parsed.number.replace(/^\+/, "");
};

export const validateCNPJ = (cnpj: string): string | false => {
  const cleanInput = cnpj.trim();
  if (!cleanInput) {
    logger.error(`[Validate CNPJ] - CNPJ is empty`);
    return false;
  }
  const cleanCNPJ = cleanInput.replace(/[^\d]+/g, "");
  if (cleanCNPJ.length !== 14) {
    logger.error(`[Validate CNPJ] - Invalid CNPJ length: ${cnpj}`);
    return false;
  }
  const checkResult = checkVAT(cleanCNPJ, [brazil]);
  if (!checkResult.isValid || !checkResult.isValidFormat) {
    logger.error(`[Validate CNPJ] - Invalid CNPJ: ${cnpj}`);
    return false;
  }
  return cleanCNPJ;
};

export const validateEmail = (email: string): string | false => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Improved regex
  if (!email || !emailRegex.test(email)) {
    logger.error(`[Validate Email] - Invalid email address: ${email}`);
    return false;
  }
  return email.toLowerCase();
};

export const validateName = (name: string): boolean => {
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    logger.error(`[Validate Name] - Invalid name length: ${name}`);
    return false;
  }
  return true;
};

export const validatePassword = (password: string): boolean => {
  if (!password || password.length < 8) {
    logger.error(`[Validate Password] - Password too short`);
    return false;
  }
  if (!/[A-Z]/.test(password)) {
    logger.error(`[Validate Password] - Password missing uppercase letter`);
    return false;
  }
  if (!/[a-z]/.test(password)) {
    logger.error(`[Validate Password] - Password missing lowercase letter`);
    return false;
  }
  if (!/[0-9]/.test(password)) {
    logger.error(`[Validate Password] - Password missing number`);
    return false;
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    logger.error(`[Validate Password] - Password missing special character`);
    return false;
  }
  return true;
};
