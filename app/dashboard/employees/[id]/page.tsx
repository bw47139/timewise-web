"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import RequireRole from "@/components/auth/RequireRole";
import EmployeePTOCard from "@/components/employee/EmployeePTOCard";
import EmployeePhotoCard from "@/components/employee/EmployeePhotoCard";
import EmployeeFaceEnrollmentCard from "@/components/employee/EmployeeFaceEnrollmentCard";
import EmployeeTimeCardTab from "@/components/employee/EmployeeTimeCardTab";

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */
function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
    6,
    10
  )}`;
}

function maskSSN(value: string) {
  const v = value.replace(/\D/g, "").slice(0, 4);
  return v ? "••••" + v : "";
}

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

// --------------------------------------------------
// Industry → Departments → Job Titles
// Industry is inherited from employee's location (Option B)
// --------------------------------------------------
const INDUSTRY_DEPARTMENTS: Record<string, string[]> = {
  Hotel: [
    "Front Office",
    "Housekeeping",
    "Food & Beverage",
    "Engineering / Maintenance",
    "Sales & Marketing",
    "Accounting / Finance",
    "Human Resources",
    "Security",
    "Laundry",
    "Recreation / Spa",
    "IT / Systems",
  ],
  Restaurant: [
    "Front of House",
    "Back of House",
    "Bar",
    "Management",
    "Delivery / Takeout",
    "Administration",
  ],
  Retail: [
    "Store Operations",
    "Cashiers",
    "Stock / Inventory",
    "Loss Prevention",
    "Customer Service",
    "Management",
  ],
  Healthcare: [
    "Nursing",
    "Clinical",
    "Front Desk / Reception",
    "Housekeeping",
    "Food Services",
    "Administration",
  ],
  Office: [
    "Administration",
    "Customer Support",
    "Sales",
    "Accounting / Finance",
    "HR",
    "IT",
  ],
  Warehouse: [
    "Receiving",
    "Picking / Packing",
    "Forklift / Equipment",
    "Inventory Control",
    "Shipping",
    "Supervision",
  ],
  Construction: [
    "Field Crew",
    "Project Management",
    "Safety",
    "Back Office",
    "Equipment",
  ],
};

const INDUSTRY_JOB_TITLES: Record<string, Record<string, string[]>> = {
  Hotel: {
    "Front Office": [
      "General Manager",
      "Assistant General Manager",
      "Front Desk Manager",
      "Front Desk Supervisor",
      "Front Desk Agent",
      "Night Auditor",
      "Concierge",
      "Bellhop",
      "Valet Attendant",
      "Reservations Agent",
    ],
    Housekeeping: [
      "Executive Housekeeper",
      "Assistant Housekeeper",
      "Housekeeping Supervisor",
      "Room Attendant",
      "Houseman",
      "Public Area Attendant",
      "Laundry Attendant",
    ],
    "Food & Beverage": [
      "F&B Director",
      "Restaurant Manager",
      "Banquet Manager",
      "Bar Manager",
      "Server",
      "Host / Hostess",
      "Bartender",
      "Cook",
      "Chef",
      "Dishwasher",
      "Banquet Server",
      "Room Service Attendant",
    ],
    "Engineering / Maintenance": [
      "Chief Engineer",
      "Maintenance Technician",
      "Painter",
      "HVAC Technician",
      "Electrician",
      "Plumber",
    ],
    "Sales & Marketing": [
      "Director of Sales",
      "Sales Manager",
      "Marketing Manager",
      "Event Coordinator",
      "Catering Sales Manager",
    ],
    "Accounting / Finance": [
      "Controller",
      "Accounting Clerk",
      "Payroll Clerk",
      "Accounts Payable Clerk",
    ],
    "Human Resources": ["HR Manager", "Recruiter", "Training Coordinator"],
    Security: [
      "Security Manager",
      "Security Guard",
      "Loss Prevention Officer",
    ],
    Laundry: ["Laundry Supervisor", "Laundry Attendant"],
    "Recreation / Spa": [
      "Spa Manager",
      "Massage Therapist",
      "Fitness Attendant",
      "Lifeguard",
      "Pool Attendant",
    ],
    "IT / Systems": ["IT Manager", "Systems Technician", "Network Administrator"],
  },

  Restaurant: {
    "Front of House": [
      "Restaurant Manager",
      "Shift Leader",
      "Server",
      "Host / Hostess",
      "Busser",
      "Expeditor",
    ],
    "Back of House": [
      "Kitchen Manager",
      "Line Cook",
      "Prep Cook",
      "Dishwasher",
      "Sous Chef",
      "Executive Chef",
    ],
    Bar: ["Bar Manager", "Bartender", "Barback"],
    Management: ["General Manager", "Assistant Manager"],
    "Delivery / Takeout": [
      "Delivery Driver",
      "To-Go Specialist",
      "Order Taker",
    ],
    Administration: ["Bookkeeper", "Office Manager"],
  },

  Retail: {
    "Store Operations": [
      "Store Manager",
      "Assistant Store Manager",
      "Department Supervisor",
      "Sales Associate",
    ],
    Cashiers: ["Head Cashier", "Cashier"],
    "Stock / Inventory": [
      "Stock Associate",
      "Inventory Associate",
      "Receiving Clerk",
    ],
    "Loss Prevention": [
      "Loss Prevention Manager",
      "Loss Prevention Associate",
    ],
    "Customer Service": [
      "Customer Service Manager",
      "Customer Service Associate",
    ],
    Management: ["Store Manager", "Assistant Store Manager"],
  },

  Healthcare: {
    Nursing: ["RN", "LPN", "CNA", "Charge Nurse", "Nurse Manager"],
    Clinical: [
      "Medical Assistant",
      "Lab Technician",
      "Radiology Tech",
      "Therapist",
    ],
    "Front Desk / Reception": [
      "Receptionist",
      "Scheduler",
      "Patient Coordinator",
    ],
    Housekeeping: ["Housekeeper", "EVS Tech", "Floor Tech"],
    "Food Services": ["Dietary Aide", "Cook", "Dietary Manager"],
    Administration: ["Office Manager", "Billing Specialist", "Practice Manager"],
  },

  Office: {
    Administration: [
      "Office Manager",
      "Administrative Assistant",
      "Receptionist",
      "Executive Assistant",
    ],
    "Customer Support": [
      "Customer Support Rep",
      "Call Center Agent",
      "Client Success Manager",
    ],
    Sales: ["Sales Rep", "Account Executive", "Sales Manager"],
    "Accounting / Finance": [
      "Accountant",
      "Bookkeeper",
      "AP/AR Clerk",
      "Payroll Specialist",
    ],
    HR: ["HR Generalist", "HR Manager", "Recruiter"],
    IT: ["IT Support", "Systems Administrator", "Developer"],
  },

  Warehouse: {
    Receiving: ["Receiver", "Dock Worker"],
    "Picking / Packing": ["Picker", "Packer", "Order Filler"],
    "Forklift / Equipment": [
      "Forklift Operator",
      "Equipment Operator",
      "Yard Driver",
    ],
    "Inventory Control": ["Inventory Clerk", "Cycle Counter"],
    Shipping: ["Shipping Clerk", "Loader"],
    Supervision: ["Warehouse Supervisor", "Warehouse Manager"],
  },

  Construction: {
    "Field Crew": [
      "Laborer",
      "Carpenter",
      "Electrician",
      "Plumber",
      "Operator",
    ],
    "Project Management": [
      "Project Manager",
      "Superintendent",
      "Foreman",
      "Estimator",
    ],
    Safety: ["Safety Manager", "Safety Coordinator"],
    "Back Office": ["Project Coordinator", "Office Manager", "AP/AR Clerk"],
    Equipment: ["Mechanic", "Equipment Operator"],
  },
};

function getDepartmentsForIndustry(industry: string): string[] {
  return INDUSTRY_DEPARTMENTS[industry] || [];
}

function getJobTitlesForIndustry(
  industry: string,
  department: string
): string[] {
  return INDUSTRY_JOB_TITLES[industry]?.[department] || [];
}

async function verifyAddress(fullAddress: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      fullAddress
    )}&format=jsonv2&addressdetails=1&limit=1`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.length) return null;

    return data[0];
  } catch (err) {
    console.error("Address verify failed:", err);
    return null;
  }
}

/* --------------------------------------------------
   Types
-------------------------------------------------- */
type EmployeeStatus = "ACTIVE" | "TERMINATED";

type EmergencyContact = {
  id: number;
  name: string;
  phone: string;
  relation: string;
};

type Employee = {
  id: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  preferredName?: string | null;

  email?: string | null;
  status: EmployeeStatus;
  photoUrl?: string | null;
  faceEnabled?: boolean;

  // Contact
  phoneNumber?: string | null;
  phoneAlt?: string | null;

  // Address
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;

  // Employment
  jobTitle?: string | null;
  department?: string | null;
  hireDate?: string | null;

  // Personal
  dateOfBirth?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  ssnLast4?: string | null;
  maritalStatus?: string | null;

  // Termination
  terminatedAt?: string | null;
  terminationReason?: string | null;

  emergencyContacts: EmergencyContact[];

  // Location (for industry inference – Option B)
  location?: {
    id: number;
    name: string;
    industry?: string | null; // e.g. "Hotel", "Retail"
  } | null;
};

type ActivityItem = {
  id: number;
  message: string;
  createdAt: string;
  createdBy?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

type EmployeeNote = {
  id: number;
  employeeId: number;
  note: string;
  createdAt?: string;
  updatedAt?: string;
};

type EmployeeDocument = {
  id: number;
  employeeId: number;
  fileName: string;
  fileType?: string;
  fileUrl: string;
  createdAt?: string;
};

type PayRate = {
  id: number;
  employeeId: number;
  rate: number;
  effectiveDate: string;
};

type Punch = {
  id: number;
  punchTime?: string;
  timestamp?: string;
  createdAt?: string;
  type?: string;
  source?: string | null;
  [key: string]: any;
};

/* --------------------------------------------------
   Config
-------------------------------------------------- */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

/* --------------------------------------------------
   Page Component
-------------------------------------------------- */
export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = Number((params as any).id);

  // ⭐ NEW — today string for date max limits
  const today = new Date().toISOString().split("T")[0];

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [organization, setOrganization] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Basic info
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");

  // Contact
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneAlt, setPhoneAlt] = useState("");

  // Address
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  // Employment
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [hireDate, setHireDate] = useState("");

  // Personal
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "pto"
    | "activity"
    | "punches"
    | "timecard"
    | "pay"
    | "documents"
    | "notes"
  >("overview");

  const [showTerminate, setShowTerminate] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Emergency Contacts
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRelation, setNewContactRelation] = useState("");

  // Activity
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  // Punches
  const [punches, setPunches] = useState<Punch[]>([]);
  const [punchesLoaded, setPunchesLoaded] = useState(false);
  const [punchesLoading, setPunchesLoading] = useState(false);

  // Pay Rates
  const [payRates, setPayRates] = useState<PayRate[]>([]);
  const [payLoaded, setPayLoaded] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [newRateEffective, setNewRateEffective] = useState("");

  // Documents
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);

  // Notes
  const [notes, setNotes] = useState<EmployeeNote[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");

  // Overview Save state
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // ZIP lookup UI
  const [zipLoading, setZipLoading] = useState(false);
  const [zipInfo, setZipInfo] = useState<string | null>(null);

  // Street autocomplete
  const [streetQuery, setStreetQuery] = useState("");
  const [streetResults, setStreetResults] = useState<any[]>([]);
  const [streetLoading, setStreetLoading] = useState(false);
  const [streetFocused, setStreetFocused] = useState(false);

  // City autocomplete
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<string[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);

  /* --------------------------------------------------
     Load employee
  -------------------------------------------------- */
  async function loadEmployee() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/api/employee/${employeeId}`, {
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) throw new Error("Employee not found");

      const data: Employee = await res.json();

      setEmployee(data);

      setFirstName(data.firstName);
      setMiddleName(data.middleName || "");
      setLastName(data.lastName);
      setPreferredName(data.preferredName || "");
      setEmail(data.email || "");

      setPhoneNumber(data.phoneNumber || "");
      setPhoneAlt(data.phoneAlt || "");

      setAddressLine1(data.addressLine1 || "");
      setAddressLine2(data.addressLine2 || "");
      setCity(data.city || "");
      setStateField(data.state || "");
      setPostalCode(data.postalCode || "");
      setCountry(data.country || "");

      setJobTitle(data.jobTitle || "");
      setDepartment(data.department || "");
      setHireDate(data.hireDate ? data.hireDate.substring(0, 10) : "");

      setDateOfBirth(
        data.dateOfBirth ? data.dateOfBirth.substring(0, 10) : ""
      );
      setGender(data.gender || "");
      setSsnLast4(data.ssnLast4 || "");
      setMaritalStatus(data.maritalStatus || "");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load employee");
    }

    setLoading(false);
  }

  /* --------------------------------------------------
     Load Organization (for pay-period rules)
  -------------------------------------------------- */
  async function loadOrganization() {
    try {
      const res = await fetch(`${API_BASE}/api/organization`, {
        credentials: "include",
      });

      if (!res.ok) return;

      const data = await res.json();
      setOrganization(data);
    } catch (err) {
      console.error("Failed to load organization", err);
    }
  }

  useEffect(() => {
    loadEmployee();
    loadOrganization();
  }, [employeeId]);

  /* --------------------------------------------------
     ZIP → City / State lookup (auto on change)
  -------------------------------------------------- */
  useEffect(() => {
    const zip = postalCode.trim();
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) return;

    let cancelled = false;
    setZipLoading(true);
    setZipInfo(null);

    async function lookupZip() {
      try {
        const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        const place = data.places?.[0];
        if (place) {
          setCity(place["place name"] || "");
          setStateField(place.state || "");
          setZipInfo("City & State auto-filled ✔");
        }
      } catch (err) {
        console.error("ZIP lookup failed:", err);
      }

      setZipLoading(false);
      setTimeout(() => setZipInfo(null), 3000);
    }

    lookupZip();

    return () => {
      cancelled = true;
      clearTimeout(undefined as any);
    };
  }, [postalCode]);

  /* --------------------------------------------------
     Manual ZIP verify button (re-run lookup)
  -------------------------------------------------- */
  async function handleVerifyAddressClick() {
    const zip = postalCode.trim();
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) {
      setZipInfo("Enter a valid 5-digit ZIP first.");
      setTimeout(() => setZipInfo(null), 3000);
      return;
    }

    setZipLoading(true);
    setZipInfo(null);

    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (res.ok) {
        const data = await res.json();
        const place = data.places?.[0];

        if (place) {
          setCity(place["place name"] || "");
          setStateField(place.state || "");
          setZipInfo("Address verified ✔");
        } else {
          setZipInfo("ZIP found, but no city/state.");
        }
      } else {
        setZipInfo("ZIP not found.");
      }
    } catch (err) {
      console.error("Manual ZIP lookup failed:", err);
      setZipInfo("ZIP lookup failed.");
    }

    setZipLoading(false);
    setTimeout(() => setZipInfo(null), 3000);
  }

  /* --------------------------------------------------
     Street autocomplete (Address Line 1)
  -------------------------------------------------- */
  useEffect(() => {
    const q = streetQuery.trim();
    if (q.length < 3) {
      setStreetResults([]);
      return;
    }

    let cancelled = false;

    async function searchStreet() {
      setStreetLoading(true);

      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          q
        )}&format=jsonv2&addressdetails=1&limit=7`;

        const res = await fetch(url, {
          headers: { "Accept-Language": "en-US" },
        });

        if (!res.ok) {
          setStreetResults([]);
          return;
        }

        const data = await res.json();
        if (!cancelled) setStreetResults(data);
      } catch (err) {
        console.error("Street autocomplete failed:", err);
        if (!cancelled) setStreetResults([]);
      }

      setStreetLoading(false);
    }

    const delay = setTimeout(searchStreet, 300);

    return () => {
      cancelled = true;
      clearTimeout(delay);
    };
  }, [streetQuery]);

  /* --------------------------------------------------
     City autocomplete
  -------------------------------------------------- */
  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 3) {
      setCityResults([]);
      return;
    }

    let cancelled = false;

    async function lookupCity() {
      setCityLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          q
        )}&format=jsonv2&addressdetails=1&limit=7`;

        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();

        if (!cancelled) {
          const suggestions: string[] = data
            .map(
              (d: any) =>
                d.address?.city ||
                d.address?.town ||
                d.address?.village ||
                d.address?.hamlet
            )
            .filter(Boolean);

          setCityResults([...new Set(suggestions)]);
        }
      } catch (err) {
        console.error("City autocomplete failed:", err);
      }
      setCityLoading(false);
    }

    const delay = setTimeout(lookupCity, 300);

    return () => {
      cancelled = true;
      clearTimeout(delay);
    };
  }, [cityQuery]);

  /* --------------------------------------------------
     Save Overview (single PATCH + address verify)
  -------------------------------------------------- */
  async function handleSaveOverview() {
    setIsSavingOverview(true);
    setSaveMessage(null);

    try {
      const fullAddress = `${addressLine1}, ${city}, ${stateField} ${postalCode}, ${country}`;
      const verified = await verifyAddress(fullAddress);

      if (!verified && typeof window !== "undefined") {
        const proceed = window.confirm(
          "Address could not be verified. Save anyway?"
        );
        if (!proceed) {
          setIsSavingOverview(false);
          setSaveMessage("Save cancelled — address not verified.");
          setTimeout(() => setSaveMessage(null), 4000);
          return;
        }
      }

      const res = await fetch(`${API_BASE}/api/employee/${employeeId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          middleName: middleName || null,
          lastName,
          preferredName: preferredName || null,
          email: email || null,
          phoneNumber: phoneNumber || null,
          phoneAlt: phoneAlt || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: stateField || null,
          postalCode: postalCode || null,
          country: country || null,
          jobTitle: jobTitle || null,
          department: department || null,
          hireDate: hireDate || null,
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
          ssnLast4: ssnLast4 || null,
          maritalStatus: maritalStatus || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save changes");
      }

      await loadEmployee();
      setSaveMessage("Changes saved");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save employee overview:", err);
      setSaveMessage("Failed to save. Please try again.");
      setTimeout(() => setSaveMessage(null), 4000);
    } finally {
      setIsSavingOverview(false);
    }
  }

  /* --------------------------------------------------
     Terminate Employee
  -------------------------------------------------- */
  async function handleTerminate(e: FormEvent) {
    e.preventDefault();
    setSavingStatus(true);

    try {
      await fetch(`${API_BASE}/api/employee/${employeeId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "TERMINATED",
          terminationReason,
        }),
      });

      await loadEmployee();
      setShowTerminate(false);
    } catch (err) {
      console.error("Failed to terminate:", err);
    }

    setSavingStatus(false);
  }

  /* --------------------------------------------------
     Emergency Contacts
  -------------------------------------------------- */
  async function addEmergencyContact() {
    if (!newContactName || !newContactPhone || !newContactRelation) return;

    try {
      await fetch(`${API_BASE}/api/employee/${employeeId}/emergency`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newContactName,
          phone: newContactPhone,
          relation: newContactRelation,
        }),
      });

      // Reset
      setNewContactName("");
      setNewContactPhone("");
      setNewContactRelation("");

      await loadEmployee();
    } catch (err) {
      console.error("Failed to add contact:", err);
    }
  }

  async function deleteEmergencyContact(contactId: number) {
    try {
      await fetch(
        `${API_BASE}/api/employee/${employeeId}/emergency/${contactId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      await loadEmployee();
    } catch (err) {
      console.error("Failed to delete contact:", err);
    }
  }

  /* --------------------------------------------------
     Activity tab
  -------------------------------------------------- */
  async function loadActivity() {
    if (activityLoaded || activityLoading) return;
    setActivityLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/employee/${employeeId}/activity`,
        { credentials: "include" }
      );
      const data = await res.json();
      setActivity(data.data || []);
      setActivityLoaded(true);
    } catch (err) {
      console.error("Failed to load activity", err);
    }

    setActivityLoading(false);
  }

  /* --------------------------------------------------
     Punches tab
  -------------------------------------------------- */
  async function loadPunches() {
    if (punchesLoaded || punchesLoading) return;
    setPunchesLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/employee/${employeeId}/punches`,
        { credentials: "include" }
      );
      const data = await res.json();
      setPunches(data || []);
      setPunchesLoaded(true);
    } catch (err) {
      console.error("Failed to load punches", err);
    }

    setPunchesLoading(false);
  }

  /* --------------------------------------------------
     Pay rates tab
  -------------------------------------------------- */
  async function loadPayRates() {
    if (payLoaded || payLoading) return;
    setPayLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/payrates/employee/${employeeId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      setPayRates(data);
      setPayLoaded(true);
    } catch (err) {
      console.error("Failed to load pay rates", err);
    }

    setPayLoading(false);
  }

  async function addPayRate() {
    if (!newRate || !newRateEffective) return;

    try {
      await fetch(`${API_BASE}/api/payrates/employee/${employeeId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rate: Number(newRate),
          effectiveDate: newRateEffective,
        }),
      });

      setNewRate("");
      setNewRateEffective("");
      setPayLoaded(false);
      await loadPayRates();
    } catch (err) {
      console.error("Failed to add pay rate", err);
    }
  }

  /* --------------------------------------------------
     Documents tab
  -------------------------------------------------- */
  async function loadDocuments() {
    if (docsLoaded || docsLoading) return;
    setDocsLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/employee/${employeeId}/documents`,
        { credentials: "include" }
      );
      const data = await res.json();
      setDocuments(data);
      setDocsLoaded(true);
    } catch (err) {
      console.error("Failed to load documents", err);
    }

    setDocsLoading(false);
  }

  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      await fetch(`${API_BASE}/api/employee/${employeeId}/documents`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      setDocsLoaded(false);
      await loadDocuments();
    } catch (err) {
      console.error("Failed to upload document", err);
    }
  }

  async function deleteDocument(docId: number) {
    try {
      await fetch(
        `${API_BASE}/api/employee/${employeeId}/documents/${docId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      setDocsLoaded(false);
      await loadDocuments();
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  }

  /* --------------------------------------------------
     Notes tab
  -------------------------------------------------- */
  async function loadNotes() {
    if (notesLoaded || notesLoading) return;
    setNotesLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/employee/${employeeId}/notes`,
        { credentials: "include" }
      );
      const data = await res.json();
      setNotes(data || []);
      setNotesLoaded(true);
    } catch (err) {
      console.error("Failed to load notes", err);
    }

    setNotesLoading(false);
  }

  async function addNote() {
    if (!newNote) return;

    try {
      await fetch(`${API_BASE}/api/employee/${employeeId}/notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote }),
      });

      setNewNote("");
      setNotesLoaded(false);
      await loadNotes();
    } catch (err) {
      console.error("Failed to add note", err);
    }
  }

  async function deleteNote(noteId: number) {
    try {
      await fetch(
        `${API_BASE}/api/employee/${employeeId}/notes/${noteId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      setNotesLoaded(false);
      await loadNotes();
    } catch (err) {
      console.error("Failed to delete note", err);
    }
  }

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */
  if (loading) return <div className="p-6">Loading employee…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!employee) return <div className="p-6">Employee not found.</div>;

  // Industry inferred from location (Option B)
  const resolvedIndustry: string =
    employee.location?.industry?.trim() ||
    // fallback – you can change this default if most locations are Retail, etc.
    "Hotel";

  const industryDepartments = getDepartmentsForIndustry(resolvedIndustry);
  const industryJobTitles = getJobTitlesForIndustry(
    resolvedIndustry,
    department
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {employee.firstName} {employee.lastName}
            </h1>

            {/* Export PDF */}
            <button
              className="bg-black text-white px-4 py-2 rounded"
              onClick={async () => {
                try {
                  const res = await fetch(
                    `${API_BASE}/api/employee/pdf/${employeeId}`,
                    {
                      credentials: "include",
                    }
                  );

                  if (!res.ok) {
                    alert("Failed to generate PDF");
                    return;
                  }

                  const data = await res.json();

                  if (data?.url) {
                    window.open(data.url, "_blank");
                  } else {
                    alert("PDF generated but no URL returned.");
                  }
                } catch (err) {
                  console.error("PDF export error:", err);
                  alert("Error generating PDF");
                }
              }}
            >
              Export PDF
            </button>

            {/* Print Profile */}
            <button
              className="bg-white border px-4 py-2 rounded"
              onClick={() =>
                window.open(
                  `/dashboard/employees/${employeeId}/print`,
                  "_blank"
                )
              }
            >
              Print Profile
            </button>
          </div>

          {/* Show Location / Industry context */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
            {employee.location?.name && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                Location: {employee.location.name}
              </span>
            )}
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
              Industry: {resolvedIndustry}
            </span>
          </div>
        </div>

        {/* Termination */}
        {employee.status === "ACTIVE" ? (
          <button
            className="text-red-600 underline"
            onClick={() => setShowTerminate(true)}
          >
            Terminate Employee
          </button>
        ) : (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded">
            TERMINATED
          </span>
        )}
      </div>

      {/* ------------------------------------------------------------
         Tabs
      ------------------------------------------------------------ */}
      <div className="flex gap-6 border-b mb-6">
        {[
          ["overview", "Overview"],
          ["pto", "PTO"],
          ["activity", "Activity"],
          ["punches", "Punches"],
          ["timecard", "Time Card"],
          ["pay", "Pay Rates"],
          ["documents", "Documents"],
          ["notes", "Notes"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`pb-2 ${
              activeTab === key
                ? "border-b-2 border-black font-semibold"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab(key as any)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------
         Overview Tab
      ------------------------------------------------------------ */}
      {activeTab === "overview" && (
        <div>
          <div className="grid grid-cols-3 gap-6">
            {/* Photo + Face Enrollment */}
            <div className="col-span-1 space-y-6">
              <EmployeePhotoCard
                employeeId={employeeId}
                photoUrl={employee.photoUrl}
                onUploaded={loadEmployee}
              />
              <EmployeeFaceEnrollmentCard
                employeeId={employeeId}
                faceEnabled={employee.faceEnabled || false}
                onUpdated={loadEmployee}
              />
            </div>

            {/* HR Info */}
            <div className="col-span-2 space-y-6">
              <div>
                <h2 className="font-semibold text-lg mb-3">
                  Basic Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label>First Name</label>
                    <input
                      className="border p-2 rounded w-full"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Middle Name</label>
                    <input
                      className="border p-2 rounded w-full"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Last Name</label>
                    <input
                      className="border p-2 rounded w-full"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Preferred Name</label>
                    <input
                      className="border p-2 rounded w-full"
                      value={preferredName}
                      onChange={(e) => setPreferredName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Email</label>
                    <input
                      className="border p-2 rounded w-full"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h2 className="font-semibold text-lg mb-3">
                  Contact Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label>Primary Phone</label>
                    <input
                      className="border p-2 rounded w-full"
                      value={phoneNumber}
                      onChange={(e) =>
                        setPhoneNumber(normalizePhone(e.target.value))
                      }
                    />
                  </div>

                  <div>
                    <label>Alternate Phone</label>
                    <input
                      className="border p-2 rounded w-full"
                      value={phoneAlt}
                      onChange={(e) =>
                        setPhoneAlt(normalizePhone(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Employment (Industry-aware) */}
              <div>
                <h2 className="font-semibold text-lg mb-3">
                  Employment Information
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {/* Department Dropdown */}
                  <div>
                    <label>Department</label>
                    <select
                      className="border p-2 rounded w-full"
                      value={department}
                      onChange={(e) => {
                        const dept = e.target.value;
                        setDepartment(dept);

                        // Clear job title if not valid for this dept
                        const validTitles = getJobTitlesForIndustry(
                          resolvedIndustry,
                          dept
                        );
                        if (!validTitles.includes(jobTitle)) {
                          setJobTitle("");
                        }
                      }}
                    >
                      <option value="">Select Department</option>
                      {industryDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}

                      {/* Allow legacy/custom departments that aren't in list */}
                      {department &&
                        !industryDepartments.includes(department) && (
                          <option value={department}>{department}</option>
                        )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Departments based on location&apos;s industry
                    </p>
                  </div>

                  {/* Job Title Dropdown */}
                  <div>
                    <label>Job Title</label>
                    <select
                      className="border p-2 rounded w-full"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      disabled={!department}
                    >
                      <option value="">Select Job Title</option>
                      {industryJobTitles.map((title) => (
                        <option key={title} value={title}>
                          {title}
                        </option>
                      ))}

                      {/* Allow legacy/custom title not in mapping */}
                      {jobTitle &&
                        !industryJobTitles.includes(jobTitle) && (
                          <option value={jobTitle}>{jobTitle}</option>
                        )}
                    </select>
                    {!department && (
                      <p className="text-xs text-gray-500 mt-1">
                        Select a department first
                      </p>
                    )}
                  </div>

                  {/* Hire Date */}
                  <div>
                    <label>Hire Date</label>
                    <input
                      type="date"
                      className="border p-2 rounded w-full"
                      value={hireDate}
                      max={today}
                      onChange={(e) => setHireDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h2 className="font-semibold text-lg mb-3">Address</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label>Address Line 1</label>
                    <div className="relative">
                      <input
                        className="border p-2 rounded w-full"
                        value={addressLine1}
                        onChange={(e) => {
                          setAddressLine1(e.target.value);
                          setStreetQuery(e.target.value);
                        }}
                        onFocus={() => setStreetFocused(true)}
                        onBlur={() =>
                          setTimeout(() => setStreetFocused(false), 200)
                        }
                        placeholder="123 Main St"
                      />

                      {/* Loading indicator */}
                      {streetLoading && (
                        <div className="absolute right-2 top-2 text-gray-400 text-xs">
                          Searching…
                        </div>
                      )}

                      {/* Suggestions dropdown */}
                      {streetFocused && streetResults.length > 0 && (
                        <div className="absolute z-20 bg-white border rounded shadow w-full max-h-48 overflow-auto">
                          {streetResults.map((item, idx) => {
                            const display =
                              item.display_name?.split(",")[0] || "";
                            return (
                              <div
                                key={idx}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onClick={() => {
                                  setAddressLine1(display);
                                  setStreetQuery(display);
                                  setStreetFocused(false);
                                }}
                              >
                                {display}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label>Address Line 2</label>
                    <input
                      className="border p-2 rounded w-full"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>City</label>
                    <div className="relative">
                      <input
                        className="border p-2 rounded w-full"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setCityQuery(e.target.value);
                        }}
                        onFocus={() => setCityFocused(true)}
                        onBlur={() =>
                          setTimeout(() => setCityFocused(false), 200)
                        }
                      />
                      {cityLoading && (
                        <div className="absolute right-2 top-2 text-gray-400 text-xs">
                          Searching…
                        </div>
                      )}
                      {cityFocused && cityResults.length > 0 && (
                        <div className="absolute z-20 bg-white border rounded shadow w-full max-h-48 overflow-auto">
                          {cityResults.map((c, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => {
                                setCity(c);
                                setCityQuery(c);
                                setCityFocused(false);
                              }}
                            >
                              {c}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label>State</label>
                    <select
                      className="border p-2 rounded w-full"
                      value={stateField}
                      onChange={(e) => setStateField(e.target.value)}
                    >
                      <option value="">Select state</option>
                      {US_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Postal Code</label>
                    <div className="flex gap-2 items-center">
                      <input
                        className="border p-2 rounded w-full"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                      />
                      {/* Tiny verify button */}
                      <button
                        type="button"
                        className="px-3 py-2 border rounded text-xs whitespace-nowrap"
                        onClick={handleVerifyAddressClick}
                        disabled={zipLoading}
                      >
                        {zipLoading ? "..." : "Verify"}
                      </button>
                    </div>
                    {zipLoading && (
                      <div className="text-xs text-gray-500 mt-1">
                        Looking up ZIP…
                      </div>
                    )}
                    {zipInfo && (
                      <div className="text-xs text-green-600 mt-1">
                        {zipInfo}
                      </div>
                    )}
                  </div>

                  <div>
                    <label>Country</label>
                    <input
                      className="border p-2 rounded w-full"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Personal */}
              <div>
                <h2 className="font-semibold text-lg mb-3">
                  Personal Information
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      className="border p-2 rounded w-full"
                      value={dateOfBirth}
                      min="1900-01-01"
                      max={today}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Gender</label>
                    <select
                      className="border p-2 rounded w-full"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="">Select Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label>SSN Last 4</label>
                    <input
                      className="border p-2 rounded w-full"
                      value={maskSSN(ssnLast4)}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 4);
                        setSsnLast4(digits);
                      }}
                    />
                  </div>

                  <div>
                    <label>Marital Status</label>
                    <select
                      className="border p-2 rounded w-full"
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                    >
                      <option value="">Select status</option>
                      <option value="SINGLE">Single</option>
                      <option value="MARRIED">Married</option>
                      <option value="DIVORCED">Divorced</option>
                      <option value="WIDOWED">Widowed</option>
                      <option value="SEPARATED">Separated</option>
                      <option value="DOMESTIC_PARTNER">Domestic Partner</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Emergency Contacts */}
              <div>
                <h2 className="font-semibold text-lg mb-3">
                  Emergency Contacts
                </h2>

                {/* Add Contact */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <input
                    className="border p-2 rounded"
                    placeholder="Name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                  />
                  <input
                    className="border p-2 rounded"
                    placeholder="Phone"
                    value={newContactPhone}
                    onChange={(e) =>
                      setNewContactPhone(normalizePhone(e.target.value))
                    }
                  />
                  <input
                    className="border p-2 rounded"
                    placeholder="Relation"
                    value={newContactRelation}
                    onChange={(e) => setNewContactRelation(e.target.value)}
                  />
                </div>

                <button
                  className="bg-black text-white px-4 py-2 rounded mb-4"
                  onClick={addEmergencyContact}
                >
                  Add Contact
                </button>

                {/* Contacts table */}
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2">Name</th>
                      <th className="border p-2">Phone</th>
                      <th className="border p-2">Relation</th>
                      <th className="border p-2 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.emergencyContacts.map((c) => (
                      <tr key={c.id}>
                        <td className="border p-2">{c.name}</td>
                        <td className="border p-2">{c.phone}</td>
                        <td className="border p-2">{c.relation}</td>
                        <td className="border p-2 text-center">
                          <button
                            className="text-red-600"
                            onClick={() => deleteEmergencyContact(c.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}

                    {employee.emergencyContacts.length === 0 && (
                      <tr>
                        <td className="border p-4 text-center" colSpan={4}>
                          No emergency contacts added.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------
         PTO Tab
      ------------------------------------------------------------ */}
      {activeTab === "pto" && (
        <RequireRole allow={["ADMIN", "MANAGER", "SUPERVISOR"]}>
          <EmployeePTOCard employeeId={employeeId} />
        </RequireRole>
      )}

      {/* ------------------------------------------------------------
         Activity Tab
      ------------------------------------------------------------ */}
      {activeTab === "activity" && (
        <div>
          {!activityLoaded && (
            <button
              className="bg-gray-200 px-4 py-2 rounded"
              onClick={loadActivity}
            >
              Load Activity Log
            </button>
          )}

          {activityLoaded && (
            <div className="space-y-4">
              {activity.length === 0 && <div>No activity found.</div>}

              {activity.map((log) => (
                <div key={log.id} className="border p-3 rounded">
                  <div className="font-medium">{log.message}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString()} —{" "}
                    {log.createdBy?.firstName} {log.createdBy?.lastName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------
         Punches Tab
      ------------------------------------------------------------ */}
      {activeTab === "punches" && (
        <div>
          {!punchesLoaded && (
            <button
              className="bg-gray-200 px-4 py-2 rounded"
              onClick={loadPunches}
            >
              Load Punch History
            </button>
          )}

          {punchesLoaded && (
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Time</th>
                  <th className="border p-2">Type</th>
                  <th className="border p-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {punches.map((p) => (
                  <tr key={p.id}>
                    <td className="border p-2">
                      {new Date(
                        p.timestamp || p.punchTime || p.createdAt || ""
                      ).toLocaleString()}
                    </td>
                    <td className="border p-2">{p.type}</td>
                    <td className="border p-2">{p.source || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------
         Time Card Tab (role-protected)
      ------------------------------------------------------------ */}
      {activeTab === "timecard" && (
        <RequireRole allow={["ADMIN", "MANAGER", "SUPERVISOR"]}>
          {organization ? (
            <EmployeeTimeCardTab
              employeeId={employee.id}
              payPeriodType={organization.payPeriodType}
              weekStartDay={organization.weekStartDay}
            />
          ) : (
            <div className="text-sm text-gray-500">
              Loading organization settings…
            </div>
          )}
        </RequireRole>
      )}

      {/* ------------------------------------------------------------
         Pay Rates Tab
      ------------------------------------------------------------ */}
      {activeTab === "pay" && (
        <div>
          {!payLoaded && (
            <button
              className="bg-gray-200 px-4 py-2 rounded"
              onClick={loadPayRates}
            >
              Load Pay Rates
            </button>
          )}

          {payLoaded && (
            <div className="space-y-6">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Effective Date</th>
                    <th className="border p-2">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {payRates.map((r) => (
                    <tr key={r.id}>
                      <td className="border p-2">
                        {new Date(r.effectiveDate).toLocaleDateString()}
                      </td>
                      <td className="border p-2">${r.rate.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Add New Pay Rate</h3>

                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="date"
                    className="border p-2 rounded"
                    value={newRateEffective}
                    onChange={(e) => setNewRateEffective(e.target.value)}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className="border p-2 rounded"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="Rate"
                  />
                  <button
                    className="bg-black text-white px-4 py-2 rounded"
                    onClick={addPayRate}
                  >
                    Add Rate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------
         Documents Tab
      ------------------------------------------------------------ */}
      {activeTab === "documents" && (
        <div>
          {!docsLoaded && (
            <button
              className="bg-gray-200 px-4 py-2 rounded"
              onClick={loadDocuments}
            >
              Load Documents
            </button>
          )}

          {docsLoaded && (
            <div className="space-y-6">
              <div>
                <label className="block mb-2 font-medium">
                  Upload Document
                </label>
                <input type="file" onChange={uploadDocument} />
              </div>

              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">File Name</th>
                    <th className="border p-2">Uploaded</th>
                    <th className="border p-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="border p-2">
                        <a
                          href={doc.fileUrl}
                          className="text-blue-600 underline"
                          target="_blank"
                        >
                          {doc.fileName}
                        </a>
                      </td>
                      <td className="border p-2">
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          className="text-red-600"
                          onClick={() => deleteDocument(doc.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {documents.length === 0 && (
                    <tr>
                      <td className="border p-4 text-center" colSpan={3}>
                        No documents uploaded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------
         Notes Tab
      ------------------------------------------------------------ */}
      {activeTab === "notes" && (
        <div>
          {!notesLoaded && (
            <button
              className="bg-gray-200 px-4 py-2 rounded"
              onClick={loadNotes}
            >
              Load Notes
            </button>
          )}

          {notesLoaded && (
            <div className="space-y-6">
              <div className="flex gap-3 items-center">
                <input
                  className="border p-2 rounded w-full"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write a note..."
                />
                <button
                  className="bg-black text-white px-4 py-2 rounded"
                  onClick={addNote}
                >
                  Add
                </button>
              </div>

              <div className="space-y-4">
                {notes.map((n) => (
                  <div key={n.id} className="border p-3 rounded">
                    <div>{n.note}</div>
                    <div className="text-xs text-gray-500">
                      {n.createdAt
                        ? new Date(n.createdAt).toLocaleString()
                        : ""}
                    </div>
                    <button
                      className="text-red-600 text-xs underline mt-2"
                      onClick={() => deleteNote(n.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}

                {notes.length === 0 && <div>No notes added.</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------
         Floating Save button (Overview only)
      ------------------------------------------------------------ */}
      {activeTab === "overview" && !showTerminate && (
        <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2">
          {saveMessage && (
            <div className="bg-white border px-3 py-1 rounded shadow text-sm">
              {saveMessage}
            </div>
          )}
          <button
            className="bg-black text-white px-5 py-2 rounded shadow-lg disabled:opacity-50"
            onClick={handleSaveOverview}
            disabled={isSavingOverview}
          >
            {isSavingOverview ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------
         Termination Modal
      ------------------------------------------------------------ */}
      {showTerminate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form
            className="bg-white p-6 rounded shadow-xl w-96 space-y-4"
            onSubmit={handleTerminate}
          >
            <h2 className="text-lg font-semibold text-red-600">
              Terminate Employee
            </h2>

            <p className="text-sm text-gray-600">
              This will deactivate the employee and prevent future punches.
            </p>

            <textarea
              className="border p-2 rounded w-full"
              rows={3}
              placeholder="Reason for termination"
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 border rounded"
                onClick={() => setShowTerminate(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded"
                disabled={savingStatus}
              >
                {savingStatus ? "Saving…" : "Terminate"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
