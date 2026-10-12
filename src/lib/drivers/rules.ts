import { parseDateKey } from "@/lib/time-zone";

// Driver rules (pure, shared by the booking, the customer's page, the counter and the tests).
// Dates are calendar dates at the business: "1990-05-17".

// Whole years between a birthday and a date: 25 on the day of the 25th birthday, not before.
export function ageOn(dateOfBirth: string, onDate: string) {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);
  const [year, month, day] = onDate.split("-").map(Number);
  const hadBirthday = month > birthMonth || (month === birthMonth && day >= birthDay);
  return year - birthYear - (hadBirthday ? 0 : 1);
}

// Why this person can't drive for this rental, or null. Used when booking (the age) and at the
// counter (the age and the license dates).
export function driverAgeProblem(dateOfBirth: string | null, pickupDate: string, minAge: number) {
  if (!dateOfBirth) {
    return "Please enter the driver's date of birth.";
  }
  if (ageOn(dateOfBirth, pickupDate) < minAge) {
    return `Drivers must be at least ${minAge} years old on the pickup date.`;
  }
  return null;
}

export type DriverStatus = "pending" | "approved" | "rejected" | null;

export const driverStatusLabels: Record<"none" | "pending" | "approved" | "rejected", string> = {
  none: "License not sent yet",
  pending: "License being checked",
  approved: "License checked",
  rejected: "License needs another look",
};

type Profile = {
  status: DriverStatus;
  dateOfBirth: string | null;
  licenseExpiresOn: string | null;
  reviewNote: string | null;
};

// Everything that stands between this driver and the keys for a rental, in plain words.
// An empty list means they're ready.
export function driverReadinessProblems(
  profile: Profile | null,
  rental: { pickupDate: string; returnDate: string; minAge: number },
) {
  const problems: string[] = [];
  if (!profile?.status) {
    problems.push("The driver's license hasn't been sent yet.");
  } else if (profile.status === "pending") {
    problems.push("The driver's license is waiting to be checked.");
  } else if (profile.status === "rejected") {
    problems.push(
      `The driver's license was not accepted${profile.reviewNote ? `: ${profile.reviewNote}` : "."}`,
    );
  }
  const ageProblem = driverAgeProblem(
    profile?.dateOfBirth ?? null,
    rental.pickupDate,
    rental.minAge,
  );
  if (ageProblem) {
    problems.push(ageProblem);
  }
  if (profile?.licenseExpiresOn && profile.licenseExpiresOn < rental.returnDate) {
    problems.push("The driver's license expires before the return date.");
  }
  return problems;
}

export type DriverInput = {
  dateOfBirth: string;
  licenseNumber: string;
  licenseCountry: string;
  licenseExpiresOn: string;
};

type Read = (name: string) => string;

// The driver details form. `today` is today's date at the business.
export function parseDriverInput(
  read: Read,
  today: string,
): { values: DriverInput } | { error: string } {
  const dateOfBirth = parseDateKey(read("dateOfBirth"));
  const licenseNumber = read("licenseNumber").toUpperCase();
  const licenseCountry = read("licenseCountry");
  const licenseExpiresOn = parseDateKey(read("licenseExpiresOn"));
  if (!dateOfBirth || dateOfBirth >= today || ageOn(dateOfBirth, today) > 120) {
    return { error: "Please enter your date of birth." };
  }
  if (ageOn(dateOfBirth, today) < 16) {
    return { error: "Drivers must be old enough to hold a driver's license." };
  }
  if (!licenseNumber || licenseNumber.length > 40) {
    return { error: "Please enter your license number (as printed on the license)." };
  }
  if (!licenseCountry || licenseCountry.length > 60) {
    return { error: "Please enter the country that issued your license." };
  }
  if (!licenseExpiresOn) {
    return { error: "Please enter the date your license expires." };
  }
  if (licenseExpiresOn < today) {
    return { error: "Your license has expired. Please use a valid license." };
  }
  return { values: { dateOfBirth, licenseNumber, licenseCountry, licenseExpiresOn } };
}

// The date of birth Stripe read from the license ("1990-05-17"), or null.
export function verifiedDateOfBirth(
  dob: { day: number | null; month: number | null; year: number | null } | null | undefined,
) {
  if (!dob?.year || !dob.month || !dob.day) {
    return null;
  }
  return `${dob.year}-${String(dob.month).padStart(2, "0")}-${String(dob.day).padStart(2, "0")}`;
}
