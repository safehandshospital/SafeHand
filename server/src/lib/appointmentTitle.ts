/** Build appointment titles: topic + clinician. */

export function buildAppointmentTitle(input: {
  topic?: string | null;
  departmentName?: string | null;
  doctorName?: string | null;
}): string {
  const topic =
    input.topic?.trim() ||
    (input.departmentName
      ? `${input.departmentName} consultation`
      : "Clinic appointment");
  const withWho = input.doctorName?.trim()
    ? ` with ${input.doctorName.trim()}`
    : "";
  return `${topic}${withWho}`;
}
