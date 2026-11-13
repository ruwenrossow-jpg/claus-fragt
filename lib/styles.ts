/**
 * Platzhalter für auswählbare Stile (Design-Regeln, Progressbar, Maskottchen …).
 * forms.style speichert die id des gewählten Stils.
 */
export interface FormStyle {
  id: string;
  name: string;
}

export const FORM_STYLES: FormStyle[] = [{ id: "default", name: "Standard" }];
