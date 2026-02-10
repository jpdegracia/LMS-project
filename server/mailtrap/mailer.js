import { MailtrapClient } from 'mailtrap';

const TOKEN = "2844402b6d673e11afa3b6fd81941c4c";

export const mailtrapClient = new MailtrapClient({
  token: TOKEN,
});

export const sender = {
  email: "admin@thecareerlab.ph",
  name: "The Careerlab°",
};