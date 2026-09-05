import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { type User } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "./firebase";
import type {
  Client,
  CourseTemplate,
  CourseTemplateHole,
  DocumentStatus,
  DocumentType,
  Gig,
  GigApplication,
  Message,
  MessageAuthor,
  MessageThread,
  Milestone,
  MilestoneStatus,
  PortalRole,
  PortalUser,
  ConsultationBooking,
  ConsultationStatus,
  Project,
  ProjectDocument,
  ProjectShare,
  Quotation,
} from "./types";
import { applyMilestoneStatus, applyOrder, holesFromPipeline } from "./pipeline";
import { formatPeso, nextQuoteNumberFromExisting, scopeTotal } from "./quote";
import { quotationPdfBlob } from "./quotePdf";

function db() {
  return getFirebaseDb();
}

function omitUndefined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T;
}

function portalUserFromSnap(uid: string, data: Record<string, unknown>): PortalUser {
  return {
    uid,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    role: (data.role as PortalRole) ?? "client",
    company: data.company ? String(data.company) : undefined,
  };
}

export async function createUserProfileIfMissing(user: PortalUser): Promise<PortalUser> {
  const existing = await fetchUserProfile(user.uid);
  if (existing) return existing;
  const role = user.role === "subcontractor" ? "subcontractor" : "client";
  const company = user.company?.trim() || "";
  await setDoc(
    doc(db(), "users", user.uid),
    omitUndefined({
      email: user.email,
      displayName: user.displayName,
      role,
      company: company || undefined,
      updatedAt: serverTimestamp(),
    } as Record<string, unknown>),
  );
  return { ...user, role, company: company || undefined };
}

export async function fetchUserProfile(uid: string): Promise<PortalUser | null> {
  const snap = await getDoc(doc(db(), "users", uid));
  if (!snap.exists()) return null;
  return portalUserFromSnap(uid, snap.data() as Record<string, unknown>);
}

const STORED_DATA_NOTICE =
  "CasinWorks stores your name, email address, and company so your account can be attached to the right engagement and so consultation requests can be answered. Nothing is sold, and nothing is shared for advertising.";

export const ACCOUNT_PRIVACY_URL = "https://www.casinworks.com/privacy.html";
export const ACCOUNT_STORED_DATA_NOTICE = STORED_DATA_NOTICE;

/** Removes profile-owned records, then the Firebase Auth user. Engagement documents stay. */
export async function deleteAccountData(user: User) {
  const [consultations, applications] = await Promise.all([
    getDocs(query(collection(db(), "consultations"), where("clientUid", "==", user.uid))),
    getDocs(query(collection(db(), "applications"), where("applicantId", "==", user.uid))),
  ]);
  await Promise.all([
    ...consultations.docs.map((d) => deleteDoc(d.ref)),
    ...applications.docs.map((d) => deleteDoc(d.ref)),
    deleteDoc(doc(db(), "users", user.uid)),
  ]);
  await user.delete();
}

export async function findUserByEmail(email: string): Promise<PortalUser | null> {
  const q = query(collection(db(), "users"), where("email", "==", email.toLowerCase()));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  if (!first) return null;
  return portalUserFromSnap(first.id, first.data() as Record<string, unknown>);
}

export async function fetchAllPortalUsers(): Promise<PortalUser[]> {
  const snap = await getDocs(collection(db(), "users"));
  return snap.docs
    .map((d) => portalUserFromSnap(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.email.localeCompare(b.email));
}

export async function convertUserToClient(user: PortalUser) {
  const existing = await findClientByEmail(user.email);
  if (existing) {
    if (existing.authUid !== user.uid) {
      await updateClient(existing.id, { authUid: user.uid });
    }
    return existing.id;
  }
  return createClient({
    company: (user.company || user.displayName).trim(),
    contactName: user.displayName.trim() || user.email,
    email: user.email,
    phone: "",
    address: "",
    authUid: user.uid,
  });
}

export async function fetchProjectsForClient(client: { uid: string; email: string }): Promise<Project[]> {
  const email = client.email.trim().toLowerCase();
  const [byId, byEmail] = await Promise.all([
    getDocs(query(collection(db(), "projects"), where("clientId", "==", client.uid))),
    getDocs(query(collection(db(), "projects"), where("clientEmail", "==", email))),
  ]);
  const byKey = new Map<string, Project>();
  for (const d of [...byId.docs, ...byEmail.docs]) {
    byKey.set(d.id, { id: d.id, ...(d.data() as Omit<Project, "id">) });
  }
  return [...byKey.values()];
}

/** Attach pending projects (created by email before they registered) to this account. */
export async function claimProjectsForClient(uid: string, email: string, displayName: string) {
  const snap = await getDocs(
    query(collection(db(), "projects"), where("clientEmail", "==", email.trim().toLowerCase())),
  );
  await Promise.all(
    snap.docs.map((d) => {
      const data = d.data();
      if (data.clientId === uid) return Promise.resolve();
      return updateDoc(d.ref, {
        clientId: uid,
        clientName: displayName || data.clientName || email,
      });
    }),
  );
}

export async function fetchAllProjects(): Promise<Project[]> {
  const snap = await getDocs(collection(db(), "projects"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) }));
}

export async function fetchProject(id: string): Promise<Project | null> {
  const snap = await getDoc(doc(db(), "projects", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Project, "id">) };
}

export async function fetchMilestones(projectId: string): Promise<Milestone[]> {
  const q = query(collection(db(), "milestones"), where("projectId", "==", projectId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Milestone, "id">) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function updateMilestone(id: string, patch: Partial<Omit<Milestone, "id" | "projectId">>) {
  const cleaned = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  await updateDoc(doc(db(), "milestones", id), cleaned);
}

export async function deleteMilestone(id: string) {
  await deleteDoc(doc(db(), "milestones", id));
}

export function progressFromMilestones(milestones: Milestone[]) {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.status === "done").length;
  const current = milestones.some((m) => m.status === "current") ? 0.4 : 0;
  return Math.min(100, Math.round(((done + current) / milestones.length) * 100));
}

export async function syncProjectProgress(projectId: string, milestones?: Milestone[]) {
  const list = milestones ?? (await fetchMilestones(projectId));
  const progressPercentage = progressFromMilestones(list);
  const allDone = list.length > 0 && list.every((m) => m.status === "done");
  const blocked = list.some((m) => m.status === "blocked");
  const current = list.find((m) => m.status === "current");
  await updateProject(projectId, {
    progressPercentage,
    status: allDone ? "complete" : blocked ? "blocked" : "active",
    currentHoleTitle: allDone ? "Complete" : current?.title ?? "",
    currentHoleKind: current?.kind ?? "",
  });
  await publishShareSnapshot(projectId).catch(() => undefined);
  return progressPercentage;
}

export async function fetchDocuments(projectId: string): Promise<ProjectDocument[]> {
  const q = query(collection(db(), "documents"), where("projectId", "==", projectId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<ProjectDocument, "id">) }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function fetchDocument(id: string): Promise<ProjectDocument | null> {
  const snap = await getDoc(doc(db(), "documents", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<ProjectDocument, "id">) };
}

export async function uploadProjectFile(projectId: string, file: File) {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `documents/${projectId}/${Date.now()}-${safeName}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
  const fileUrl = await getDownloadURL(storageRef);
  return { fileUrl, fileName: file.name };
}

export async function createDocument(payload: Omit<ProjectDocument, "id">) {
  const body = Object.fromEntries(
    Object.entries({ ...payload, createdAt: serverTimestamp() }).filter(([, value]) => value !== undefined),
  );
  const refDoc = await addDoc(collection(db(), "documents"), body);
  if (payload.type === "invoice" || payload.type === "remittance") {
    await markPaymentStarted(payload.projectId);
  }
  return refDoc.id;
}

async function markPaymentStarted(projectId: string) {
  try {
    await updateProject(projectId, { paymentStarted: true });
  } catch {
    // Client remittance uploads cannot patch the project; delete still checks documents.
  }
}

export const PROJECT_DELETE_LOCKED_MESSAGE =
  "This project can’t be deleted after it has moved to sending the downpayment.";

export function canDeleteProject(
  project: Pick<Project, "paymentStarted" | "currentHoleKind"> | null | undefined,
  documents: Pick<ProjectDocument, "type">[] = [],
  milestones: Pick<Milestone, "kind" | "status">[] = [],
) {
  if (!project) return false;
  if (project.paymentStarted) return false;
  if (documents.some((d) => d.type === "invoice" || d.type === "remittance")) return false;
  if (project.currentHoleKind === "invoice") return false;
  if (milestones.some((m) => m.kind === "invoice" && (m.status === "current" || m.status === "done"))) return false;
  return true;
}

export async function updateDocumentStatus(id: string, status: DocumentStatus, extra: Record<string, unknown> = {}) {
  await updateDoc(doc(db(), "documents", id), { status, ...extra });
}

export async function fetchOpenGigs(): Promise<Gig[]> {
  const q = query(collection(db(), "gigs"), where("status", "==", "open"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Gig, "id">) }));
}

export async function fetchAllGigs(): Promise<Gig[]> {
  const snap = await getDocs(collection(db(), "gigs"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Gig, "id">) }));
}

export async function createGig(payload: Omit<Gig, "id">) {
  await addDoc(
    collection(db(), "gigs"),
    omitUndefined({ ...payload, createdAt: serverTimestamp() } as Record<string, unknown>),
  );
}

export async function fetchApplicationsForUser(applicantId: string): Promise<GigApplication[]> {
  const q = query(collection(db(), "applications"), where("applicantId", "==", applicantId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GigApplication, "id">) }));
}

export async function fetchApplicationsForGig(gigId: string): Promise<GigApplication[]> {
  const q = query(collection(db(), "applications"), where("gigId", "==", gigId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GigApplication, "id">) }));
}

export async function applyToGig(payload: Omit<GigApplication, "id">) {
  await addDoc(collection(db(), "applications"), {
    ...payload,
    createdAt: new Date().toISOString(),
  });
}

export async function updateApplicationStatus(id: string, status: GigApplication["status"]) {
  await updateDoc(doc(db(), "applications", id), { status });
}

export async function updateGigStatus(id: string, status: Gig["status"]) {
  await updateDoc(doc(db(), "gigs", id), { status });
}

export async function createProject(payload: Omit<Project, "id">) {
  const refDoc = await addDoc(
    collection(db(), "projects"),
    omitUndefined({ ...payload, createdAt: serverTimestamp() } as Record<string, unknown>),
  );
  return refDoc.id;
}

export async function updateProject(id: string, patch: Partial<Omit<Project, "id">>) {
  await updateDoc(
    doc(db(), "projects", id),
    omitUndefined({ ...patch, updatedAt: serverTimestamp() } as Record<string, unknown>),
  );
}

function createShareToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function projectShareUrl(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/portal/view/${token}`;
}

export async function publishShareSnapshot(projectId: string, token?: string) {
  const project = await fetchProject(projectId);
  const shareToken = token ?? project?.shareToken;
  if (!project || !shareToken) return;
  await setDoc(
    doc(db(), "projectShares", shareToken),
    omitUndefined({
      projectId,
      clientEmail: project.clientEmail,
      updatedAt: serverTimestamp(),
    } as Record<string, unknown>),
  );
}

export async function ensureProjectShare(projectId: string) {
  const project = await fetchProject(projectId);
  if (!project) throw new Error("Project not found.");
  if (project.shareToken) {
    await publishShareSnapshot(projectId, project.shareToken);
    return project.shareToken;
  }
  const token = createShareToken();
  await updateProject(projectId, { shareToken: token });
  await publishShareSnapshot(projectId, token);
  return token;
}

function mapProjectShare(id: string, data: Record<string, unknown>): ProjectShare {
  const milestones = Array.isArray(data.milestones) ? (data.milestones as Milestone[]) : [];
  return {
    token: id,
    projectId: String(data.projectId ?? ""),
    clientEmail: String(data.clientEmail ?? ""),
    clientName: String(data.clientName ?? ""),
    name: String(data.name ?? "Project"),
    status: (data.status as Project["status"]) ?? "active",
    progressPercentage: Number(data.progressPercentage ?? 0),
    currentHoleTitle: data.currentHoleTitle ? String(data.currentHoleTitle) : "",
    timelineStart: data.timelineStart ? String(data.timelineStart) : "",
    timelineEnd: data.timelineEnd ? String(data.timelineEnd) : "",
    milestones: [...milestones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  };
}

export async function fetchProjectShare(token: string): Promise<ProjectShare | null> {
  const snap = await getDoc(doc(db(), "projectShares", token));
  if (!snap.exists()) return null;
  return mapProjectShare(snap.id, snap.data() as Record<string, unknown>);
}

export function listenProjectShare(
  token: string,
  onData: (share: ProjectShare | null) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    doc(db(), "projectShares", token),
    (snap) => {
      onData(snap.exists() ? mapProjectShare(snap.id, snap.data() as Record<string, unknown>) : null);
    },
    (err) => onError?.(err),
  );
}

export async function deleteProject(id: string, opts?: { force?: boolean }) {
  const project = await fetchProject(id);
  const [milestones, documents] = await Promise.all([
    getDocs(query(collection(db(), "milestones"), where("projectId", "==", id))),
    getDocs(query(collection(db(), "documents"), where("projectId", "==", id))),
  ]);
  const docs = documents.docs.map((d) => d.data() as Omit<ProjectDocument, "id">);
  const holes = milestones.docs.map((d) => d.data() as Omit<Milestone, "id">);
  if (!opts?.force && !canDeleteProject(project, docs, holes)) {
    throw new Error(PROJECT_DELETE_LOCKED_MESSAGE);
  }
  await Promise.all([
    ...milestones.docs.map((d) => deleteDoc(d.ref)),
    ...documents.docs.map((d) => deleteDoc(d.ref)),
    ...(project?.shareToken ? [deleteDoc(doc(db(), "projectShares", project.shareToken))] : []),
    deleteDoc(doc(db(), "projects", id)),
  ]);
}

export async function createMilestone(payload: Omit<Milestone, "id">) {
  const refDoc = await addDoc(
    collection(db(), "milestones"),
    omitUndefined({ ...payload } as Record<string, unknown>),
  );
  return refDoc.id;
}

export function holesFromMilestones(milestones: Milestone[]): CourseTemplateHole[] {
  return [...milestones]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((m) => {
      const hole: CourseTemplateHole = {
        title: m.title,
        kind: m.kind ?? "custom",
        description: m.description || "",
        requiresAction: Boolean(m.requiresAction),
        attachmentNeed: m.attachmentNeed ?? "none",
      };
      if (m.actionType) hole.actionType = m.actionType;
      return hole;
    });
}

export async function reorderMilestones(projectId: string, orderedIds: string[]) {
  const list = await fetchMilestones(projectId);
  const next = applyOrder(list, orderedIds);
  await Promise.all(next.map((row) => updateMilestone(row.id, { order: row.order, status: row.status })));
  await syncProjectProgress(projectId, next);
}

export async function deleteMilestoneOnCourse(projectId: string, milestoneId: string) {
  const list = await fetchMilestones(projectId);
  await deleteMilestone(milestoneId);
  const remainingIds = list.filter((m) => m.id !== milestoneId).map((m) => m.id);
  if (remainingIds.length === 0) {
    await syncProjectProgress(projectId, []);
    return;
  }
  await reorderMilestones(projectId, remainingIds);
}

export async function fetchCourseTemplates(): Promise<CourseTemplate[]> {
  const snap = await getDocs(collection(db(), "courseTemplates"));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name ?? "Untitled"),
        holes: Array.isArray(data.holes) ? (data.holes as CourseTemplateHole[]) : [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCourseTemplate(name: string, holes: CourseTemplateHole[]) {
  const refDoc = await addDoc(
    collection(db(), "courseTemplates"),
    omitUndefined({
      name: name.trim(),
      holes,
      createdAt: serverTimestamp(),
    } as Record<string, unknown>),
  );
  return refDoc.id;
}

export async function deleteCourseTemplate(id: string) {
  await deleteDoc(doc(db(), "courseTemplates", id));
}

export async function applyCourseTemplate(
  projectId: string,
  holes: CourseTemplateHole[],
  mode: "append" | "replace",
) {
  const existing = await fetchMilestones(projectId);
  if (mode === "replace") {
    await Promise.all(existing.map((m) => deleteMilestone(m.id)));
  }
  const base = mode === "replace" ? [] : existing;
  const hasCurrent = base.some((m) => m.status === "current" || m.status === "blocked");
  const today = new Date().toISOString().slice(0, 10);
  for (const [i, hole] of holes.entries()) {
    await createMilestone({
      projectId,
      title: hole.title,
      kind: hole.kind ?? "custom",
      date: today,
      description: hole.description || "",
      requiresAction: Boolean(hole.requiresAction),
      attachmentNeed: hole.attachmentNeed ?? "none",
      ...(hole.actionType ? { actionType: hole.actionType } : {}),
      status: !hasCurrent && i === 0 ? "current" : "upcoming",
      order: base.length + i,
    });
  }
  await syncProjectProgress(projectId);
}

export function standardCourseHoles() {
  return holesFromPipeline();
}

export async function commitMilestoneStatus(projectId: string, milestones: Milestone[], id: string, status: MilestoneStatus) {
  const next = applyMilestoneStatus(milestones, id, status);
  await Promise.all(
    next.map((row) => updateMilestone(row.id, { status: row.status, requiresAction: row.requiresAction })),
  );
  const list = await fetchMilestones(projectId);
  await syncProjectProgress(projectId, list);
}

function clientFromSnap(id: string, data: Record<string, unknown>): Client {
  return {
    id,
    company: String(data.company ?? ""),
    contactName: String(data.contactName ?? ""),
    email: String(data.email ?? "").toLowerCase(),
    phone: String(data.phone ?? ""),
    address: String(data.address ?? ""),
    authUid: data.authUid ? String(data.authUid) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
  };
}

export async function fetchAllClients(): Promise<Client[]> {
  const snap = await getDocs(collection(db(), "clients"));
  return snap.docs
    .map((d) => clientFromSnap(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.company.localeCompare(b.company) || a.contactName.localeCompare(b.contactName));
}

export async function fetchClient(id: string): Promise<Client | null> {
  const snap = await getDoc(doc(db(), "clients", id));
  if (!snap.exists()) return null;
  return clientFromSnap(snap.id, snap.data() as Record<string, unknown>);
}

export async function findClientByEmail(email: string): Promise<Client | null> {
  const q = query(collection(db(), "clients"), where("email", "==", email.trim().toLowerCase()));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  if (!first) return null;
  return clientFromSnap(first.id, first.data() as Record<string, unknown>);
}

export async function createClient(input: Omit<Client, "id">) {
  const email = input.email.trim().toLowerCase();
  const existingUser = await findUserByEmail(email);
  const refDoc = await addDoc(collection(db(), "clients"), {
    company: input.company.trim(),
    contactName: input.contactName.trim(),
    email,
    phone: input.phone.trim(),
    address: input.address.trim(),
    notes: input.notes?.trim() || "",
    authUid: existingUser?.uid ?? input.authUid ?? "",
    createdAt: serverTimestamp(),
  });
  return refDoc.id;
}

export async function updateClient(id: string, patch: Partial<Omit<Client, "id">>) {
  const cleaned = Object.fromEntries(
    Object.entries({
      ...patch,
      email: patch.email?.trim().toLowerCase(),
      updatedAt: serverTimestamp(),
    }).filter(([, value]) => value !== undefined),
  );
  await updateDoc(doc(db(), "clients", id), cleaned);
}

export async function linkCrmClientOnLogin(uid: string, email: string) {
  const snap = await getDocs(query(collection(db(), "clients"), where("email", "==", email.trim().toLowerCase())));
  await Promise.all(
    snap.docs.map((d) => {
      if (d.data().authUid === uid) return Promise.resolve();
      return updateDoc(d.ref, { authUid: uid });
    }),
  );
}

export async function fetchProjectsForCrmClient(crmClientId: string): Promise<Project[]> {
  const q = query(collection(db(), "projects"), where("crmClientId", "==", crmClientId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) }));
}

export async function createEngagement(input: {
  client: Client;
  name: string;
  budget?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const existingUser = input.client.authUid
    ? { uid: input.client.authUid, displayName: input.client.contactName }
    : await findUserByEmail(input.client.email);
  const projectId = await createProject({
    name: input.name.trim(),
    clientId: existingUser?.uid ?? input.client.authUid ?? "",
    clientEmail: input.client.email,
    clientName: input.client.company || input.client.contactName || input.client.email,
    crmClientId: input.client.id,
    budget: input.budget?.trim() || undefined,
    status: "active",
    progressPercentage: 0,
    timelineStart: today,
  });
  for (const [i, hole] of holesFromPipeline().entries()) {
    await createMilestone({
      projectId,
      title: hole.title,
      kind: hole.kind,
      date: today,
      description: hole.description,
      status: i === 0 ? "current" : "upcoming",
      requiresAction: Boolean(hole.requiresAction),
      attachmentNeed: hole.attachmentNeed ?? "none",
      ...(hole.actionType ? { actionType: hole.actionType } : {}),
      order: i,
    });
  }
  await syncProjectProgress(projectId);
  await ensureProjectShare(projectId).catch(() => undefined);
  return projectId;
}

export async function issueInvoice(payload: Omit<ProjectDocument, "id" | "type">) {
  return createDocument({ ...payload, type: "invoice" });
}

export async function nextQuoteNumber() {
  const snap = await getDocs(query(collection(db(), "documents"), where("type", "==", "quotation")));
  const existing = snap.docs.map((d) => {
    const data = d.data();
    return String(data.quotation?.quoteNumber ?? data.referenceNumber ?? "");
  });
  return nextQuoteNumberFromExisting(existing);
}

export async function issueQuotation(projectId: string, quote: Quotation, uploadedBy: string) {
  const blob = await quotationPdfBlob(quote);
  const file = new File([blob], `${quote.quoteNumber}.pdf`, { type: "application/pdf" });
  const uploaded = await uploadProjectFile(projectId, file);
  const id = await createDocument({
    projectId,
    type: "quotation",
    title: `Quotation ${quote.quoteNumber}`,
    fileUrl: uploaded.fileUrl,
    fileName: uploaded.fileName,
    amount: formatPeso(scopeTotal(quote.scope)),
    numericAmount: scopeTotal(quote.scope),
    status: "issued",
    uploadedBy,
    date: quote.issueDate,
    dueDate: quote.validUntil,
    referenceNumber: quote.quoteNumber,
    quotation: quote,
  });
  return { id, fileUrl: uploaded.fileUrl, fileName: uploaded.fileName, quoteNumber: quote.quoteNumber };
}

export function statusLabel(status: DocumentStatus) {
  switch (status) {
    case "pending_review":
      return "Pending review";
    case "confirmed":
      return "Confirmed";
    case "paid":
      return "Paid";
    case "awaiting_payment":
      return "Awaiting payment";
    case "needs_upload":
      return "Needs your upload";
    case "issued":
      return "Issued";
    case "accepted":
      return "Accepted";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

export function docTypeLabel(type: DocumentType) {
  switch (type) {
    case "consultation":
      return "CN";
    case "demo":
      return "DM";
    case "proposal":
      return "PR";
    case "quotation":
      return "QT";
    case "PO":
      return "PO";
    case "invoice":
      return "IN";
    case "remittance":
      return "RM";
    case "technical":
      return "TS";
    case "other":
      return "PM";
  }
}

export function docTypeName(type: DocumentType) {
  switch (type) {
    case "consultation":
      return "Consultation";
    case "demo":
      return "Demo";
    case "proposal":
      return "Proposal";
    case "quotation":
      return "Quotation";
    case "PO":
      return "Purchase order";
    case "invoice":
      return "Invoice";
    case "remittance":
      return "Remittance";
    case "technical":
      return "Technical";
    case "other":
      return "Project file";
  }
}

export const DOCUMENT_GROUPS: { id: string; label: string; types: DocumentType[] }[] = [
  { id: "engagement", label: "Consultation & demos", types: ["consultation", "demo"] },
  { id: "commercial", label: "Commercial", types: ["quotation", "proposal", "PO", "invoice", "remittance"] },
  { id: "delivery", label: "Technical & project files", types: ["technical", "other"] },
];

export const ATTACHABLE_TYPES: DocumentType[] = ["consultation", "demo", "proposal", "technical", "other"];

function consultationFromData(id: string, data: Record<string, unknown>): ConsultationBooking {
  return {
    id,
    clientUid: String(data.clientUid ?? ""),
    clientEmail: String(data.clientEmail ?? ""),
    clientName: String(data.clientName ?? ""),
    company: data.company ? String(data.company) : undefined,
    startsAt: String(data.startsAt ?? ""),
    hours: Number(data.hours ?? 1),
    notes: data.notes ? String(data.notes) : undefined,
    status: (data.status as ConsultationStatus) ?? "requested",
  };
}

export function listenConsultations(cb: (rows: ConsultationBooking[]) => void, onError?: (message: string) => void) {
  return onSnapshot(
    collection(db(), "consultations"),
    (snap) => cb(snap.docs.map((d) => consultationFromData(d.id, d.data() as Record<string, unknown>))),
    (err) => onError?.(err.message),
  );
}

export async function createConsultation(input: {
  clientUid: string;
  clientEmail: string;
  clientName: string;
  company?: string;
  startsAt: string;
  hours: number;
  notes?: string;
}) {
  const refDoc = await addDoc(
    collection(db(), "consultations"),
    omitUndefined({
      clientUid: input.clientUid,
      clientEmail: input.clientEmail.trim().toLowerCase(),
      clientName: input.clientName.trim(),
      company: input.company?.trim() || undefined,
      startsAt: input.startsAt,
      hours: input.hours,
      notes: input.notes?.trim() || undefined,
      status: "requested",
      createdAt: serverTimestamp(),
    } as Record<string, unknown>),
  );
  return refDoc.id;
}

export async function updateConsultationStatus(id: string, status: ConsultationStatus) {
  await updateDoc(doc(db(), "consultations", id), { status });
}

/* ---------------------------------------------------------------- messaging */

/** Never read; sorts before every real ISO timestamp. */
const NEVER_READ = "";

/**
 * Thread ids are derived from what the thread is about, so opening a thread is
 * idempotent — two people hitting "Message" at once converge on one document
 * instead of racing to create two.
 */
export function threadIdForProject(projectId: string) {
  return `p_${projectId}`;
}

export function threadIdForClient(clientUid: string) {
  return `c_${clientUid}`;
}

function messageThreadFromData(id: string, data: Record<string, unknown>): MessageThread {
  return {
    id,
    clientUid: String(data.clientUid ?? ""),
    clientEmail: String(data.clientEmail ?? ""),
    clientName: String(data.clientName ?? ""),
    projectId: data.projectId ? String(data.projectId) : undefined,
    projectName: data.projectName ? String(data.projectName) : undefined,
    subject: String(data.subject ?? "Messages"),
    createdAt: String(data.createdAt ?? ""),
    lastMessageAt: String(data.lastMessageAt ?? ""),
    lastMessagePreview: String(data.lastMessagePreview ?? ""),
    lastMessageBy: (data.lastMessageBy as MessageAuthor) ?? "client",
    adminReadAt: String(data.adminReadAt ?? NEVER_READ),
    clientReadAt: String(data.clientReadAt ?? NEVER_READ),
  };
}

function messageFromData(threadId: string, id: string, data: Record<string, unknown>): Message {
  return {
    id,
    threadId,
    body: String(data.body ?? ""),
    senderUid: String(data.senderUid ?? ""),
    senderName: String(data.senderName ?? ""),
    senderRole: (data.senderRole as MessageAuthor) ?? "client",
    createdAt: String(data.createdAt ?? ""),
  };
}

/** True when the other side has spoken since this side last opened the thread. */
export function threadHasUnread(thread: MessageThread, viewer: MessageAuthor) {
  if (!thread.lastMessageAt) return false;
  if (thread.lastMessageBy === viewer) return false;
  const readAt = viewer === "admin" ? thread.adminReadAt : thread.clientReadAt;
  return !readAt || readAt < thread.lastMessageAt;
}

export function countUnreadThreads(threads: MessageThread[], viewer: MessageAuthor) {
  return threads.reduce((n, t) => (threadHasUnread(t, viewer) ? n + 1 : n), 0);
}

function sortThreads(rows: MessageThread[]) {
  return [...rows].sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
}

/**
 * Admins watch every thread; clients watch their own by email, which also picks
 * up threads the studio opened before they had registered.
 *
 * Sorting happens here rather than in the query so neither call needs a
 * composite index deployed.
 */
export function listenThreads(
  viewer: { role: PortalRole; email: string },
  cb: (rows: MessageThread[]) => void,
  onError?: (message: string) => void,
) {
  const base = collection(db(), "threads");
  const q =
    viewer.role === "admin"
      ? query(base)
      : query(base, where("clientEmail", "==", viewer.email.trim().toLowerCase()));
  return onSnapshot(
    q,
    (snap) => cb(sortThreads(snap.docs.map((d) => messageThreadFromData(d.id, d.data() as Record<string, unknown>)))),
    (err) => onError?.(err.message),
  );
}

export function listenThread(
  threadId: string,
  cb: (thread: MessageThread | null) => void,
  onError?: (message: string) => void,
) {
  return onSnapshot(
    doc(db(), "threads", threadId),
    (snap) => cb(snap.exists() ? messageThreadFromData(snap.id, snap.data() as Record<string, unknown>) : null),
    (err) => onError?.(err.message),
  );
}

export function listenMessages(
  threadId: string,
  cb: (rows: Message[]) => void,
  onError?: (message: string) => void,
) {
  return onSnapshot(
    query(collection(db(), "threads", threadId, "messages"), orderBy("createdAt")),
    (snap) => cb(snap.docs.map((d) => messageFromData(threadId, d.id, d.data() as Record<string, unknown>))),
    (err) => onError?.(err.message),
  );
}

/**
 * Creates the thread only when it is missing, so callers can treat "open the
 * conversation" as a single safe call.
 */
export async function ensureThread(input: {
  id: string;
  clientUid: string;
  clientEmail: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  subject: string;
  openedBy: MessageAuthor;
}): Promise<string> {
  const refDoc = doc(db(), "threads", input.id);
  const existing = await getDoc(refDoc);
  if (existing.exists()) return input.id;

  const now = new Date().toISOString();
  await setDoc(
    refDoc,
    omitUndefined({
      clientUid: input.clientUid,
      clientEmail: input.clientEmail.trim().toLowerCase(),
      clientName: input.clientName.trim(),
      projectId: input.projectId || undefined,
      projectName: input.projectName?.trim() || undefined,
      subject: input.subject.trim() || "Messages",
      createdAt: now,
      // An empty thread reads as "nothing said yet" on both sides.
      lastMessageAt: "",
      lastMessagePreview: "",
      lastMessageBy: input.openedBy,
      adminReadAt: NEVER_READ,
      clientReadAt: NEVER_READ,
    } as Record<string, unknown>),
  );
  return input.id;
}

export const MESSAGE_MAX_LENGTH = 4000;

/**
 * Appends a message and refreshes the thread summary the inbox reads from.
 *
 * The push notification is deliberately best-effort: a failed notify must never
 * lose a message that is already committed to Firestore.
 */
export async function sendMessage(input: {
  threadId: string;
  body: string;
  senderUid: string;
  senderName: string;
  senderRole: MessageAuthor;
  idToken?: string;
}) {
  const body = input.body.trim();
  if (!body) throw new Error("Write a message first.");
  if (body.length > MESSAGE_MAX_LENGTH) {
    throw new Error(`Keep the message under ${MESSAGE_MAX_LENGTH} characters.`);
  }

  const now = new Date().toISOString();
  const created = await addDoc(collection(db(), "threads", input.threadId, "messages"), {
    body,
    senderUid: input.senderUid,
    senderName: input.senderName,
    senderRole: input.senderRole,
    createdAt: now,
  });

  await updateDoc(doc(db(), "threads", input.threadId), {
    lastMessageAt: now,
    lastMessagePreview: body.slice(0, 140),
    lastMessageBy: input.senderRole,
    // Sending counts as reading everything before it.
    ...(input.senderRole === "admin" ? { adminReadAt: now } : { clientReadAt: now }),
  });

  if (input.idToken) {
    void notifyNewMessage(input.threadId, created.id, input.idToken);
  }
  return created.id;
}

async function notifyNewMessage(threadId: string, messageId: string, idToken: string) {
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ threadId, messageId }),
    });
  } catch {
    // Delivery is a convenience; the message is already saved.
  }
}

export async function markThreadRead(threadId: string, viewer: MessageAuthor) {
  const now = new Date().toISOString();
  await updateDoc(
    doc(db(), "threads", threadId),
    viewer === "admin" ? { adminReadAt: now } : { clientReadAt: now },
  );
}

/** Registers a device for push. Tokens live on the user so rules already cover them. */
export async function saveFcmToken(uid: string, token: string) {
  const refDoc = doc(db(), "users", uid);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return;
  const current = (snap.data().fcmTokens as string[] | undefined) ?? [];
  if (current.includes(token)) return;
  // Capped so a user cycling devices cannot grow the document without bound.
  const next = [...current, token].slice(-10);
  await updateDoc(refDoc, { fcmTokens: next });
}

export async function removeFcmToken(uid: string, token: string) {
  const refDoc = doc(db(), "users", uid);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return;
  const current = (snap.data().fcmTokens as string[] | undefined) ?? [];
  if (!current.includes(token)) return;
  await updateDoc(refDoc, { fcmTokens: current.filter((t) => t !== token) });
}

export async function attachProjectRecord(input: {
  projectId: string;
  type: DocumentType;
  title: string;
  notes?: string;
  date: string;
  meetingAt?: string;
  attendees?: string;
  file?: File | null;
  uploadedBy: string;
  amount?: string;
  numericAmount?: number;
}) {
  const uploaded = input.file ? await uploadProjectFile(input.projectId, input.file) : undefined;
  return createDocument({
    projectId: input.projectId,
    type: input.type,
    title: input.title.trim(),
    notes: input.notes?.trim() || undefined,
    date: input.date,
    meetingAt: input.meetingAt || undefined,
    attendees: input.attendees?.trim() || undefined,
    fileUrl: uploaded?.fileUrl,
    fileName: uploaded?.fileName,
    status: "issued",
    uploadedBy: input.uploadedBy,
    amount: input.amount,
    numericAmount: input.numericAmount,
  });
}
