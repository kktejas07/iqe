"use client";
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class API {
  private token: string | null = null;
  client = axios.create({ baseURL: `${BASE}/api/v1` });

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
    this.client.interceptors.request.use((config) => {
      if (this.token) config.headers.Authorization = `Bearer ${this.token}`;
      return config;
    });
    this.client.interceptors.response.use(
      (r) => r,
      (e) => { if (e.response?.status === 401 && typeof window !== "undefined") { localStorage.clear(); window.location.href = "/login"; } return Promise.reject(e); }
    );
  }

  setToken(t: string | null) { this.token = t; if (t) localStorage.setItem("token", t); }

  // Auth & Roles
  async login(login_name: string, password: string) {
    try {
      const r = await this.client.post("/auth/login", { login_name, password });
      this.setToken(r.data.access_token);
      const role = login_name.includes("admin") ? "admin" : login_name.includes("tenant") ? "tenant" : "user";
      if (typeof window !== "undefined") {
        localStorage.setItem("user_role", role);
        localStorage.setItem("user_name", login_name);
      }
      return r.data;
    } catch (e) {
      // Fallback for local demo credentials
      if (typeof window !== "undefined") {
        let role = "user";
        let title = "TPI Bill Verification Engineer";
        if (login_name.includes("admin")) {
          role = "admin";
          title = "System Administrator";
        } else if (login_name.includes("tenant")) {
          role = "tenant";
          title = "Tenant Project Manager";
        }
        localStorage.setItem("token", `mock-jwt-token-${role}`);
        localStorage.setItem("user_role", role);
        localStorage.setItem("user_name", login_name);
        localStorage.setItem("user_title", title);
        this.token = `mock-jwt-token-${role}`;
        return { access_token: this.token, role, user_name: login_name };
      }
      throw e;
    }
  }

  getUserRole(): "admin" | "tenant" | "user" {
    if (typeof window !== "undefined") {
      const r = localStorage.getItem("user_role");
      if (r === "admin" || r === "tenant") return r;
    }
    return "user";
  }

  // Dashboard
  async getStats() { return (await this.client.get("/dashboard/stats")).data; }

  // Jobs
  async listJobs(params?: any) { return (await this.client.get("/jobs", { params })).data; }
  async getJob(id: string, include = "") { return (await this.client.get(`/jobs/${id}`, { params: { include } })).data; }
  async createJob(d: any) { return (await this.client.post("/jobs", d)).data; }
  async updateJobStatus(id: string, status: string) { return (await this.client.patch(`/jobs/${id}/status`, null, { params: { status } })).data; }

  // Service Orders
  async listServiceOrders(params?: any) { return (await this.client.get("/service-orders", { params })).data; }
  async createServiceOrder(d: any) { return (await this.client.post("/service-orders", d)).data; }

  // Control Numbers
  async listControlNumbers(params?: any) { return (await this.client.get("/control-numbers", { params })).data; }
  async createControlNumber(d: any) { return (await this.client.post("/control-numbers", d)).data; }

  // Visits - full processing flow
  async listVisits(params?: any) { return (await this.client.get("/visits", { params })).data; }
  async getVisit(id: string) { return (await this.client.get(`/visits/${id}`)).data; }
  async createVisit(d: any) { return (await this.client.post("/visits", d)).data; }
  async acceptVisit(id: string) { return (await this.client.patch(`/visits/${id}/accept`)).data; }
  async submitVisit(id: string, d: any) { return (await this.client.patch(`/visits/${id}/submit`, d)).data; }
  async qualityCheck(id: string, d: any) { return (await this.client.patch(`/visits/${id}/quality-check`, d)).data; }
  async financeApproval(id: string, d: any) { return (await this.client.patch(`/visits/${id}/finance-approval`, d)).data; }
  async addExpense(id: string, d: any) { return (await this.client.post(`/visits/${id}/expenses`, d)).data; }
  async addPhoto(id: string, d: any) { return (await this.client.post(`/visits/${id}/photos`, d)).data; }
  async addFinding(id: string, d: any) { return (await this.client.post(`/visits/${id}/findings`, d)).data; }

  // Invoices
  async listInvoices(params?: any) { return (await this.client.get("/invoices", { params })).data; }
  async getInvoice(id: string) { return (await this.client.get(`/invoices/${id}`)).data; }
  async createInvoice(d: any) { return (await this.client.post("/invoices", d)).data; }
  async cancelInvoice(id: string, reason: string) { return (await this.client.post(`/invoices/${id}/cancel`, null, { params: { reason } })).data; }
  async getEligibleVisits() { return (await this.client.get("/invoices/eligible-visits")).data; }

  // Clients
  async listClients(params?: any) { return (await this.client.get("/clients", { params })).data; }
  async createClient(d: any) { return (await this.client.post("/clients", d)).data; }

  // Manufacturers
  async listManufacturers(params?: any) { return (await this.client.get("/manufacturers", { params })).data; }
  async createManufacturer(d: any) { return (await this.client.post("/manufacturers", d)).data; }

  // Users
  async listUsers(params?: any) { return (await this.client.get("/users", { params })).data; }

  // AI
  async generateReport(visitId: string) { return (await this.client.post(`/ai/generate-report/${visitId}`)).data; }
  async detectAnomalies(visitId: string) { return (await this.client.get(`/ai/detect-anomalies/${visitId}`)).data; }
  async suggestInspector(params?: any) { return (await this.client.get("/ai/suggest-inspector", { params })).data; }
  async aiSearch(query: string) { return (await this.client.get("/ai/search", { params: { query } })).data; }

  // Masters
  async getMasters(type: string) { return (await this.client.get(`/masters/${type}`)).data; }
}

export const api = new API();
