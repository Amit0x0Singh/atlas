import express from "express";

// ── Sub-routers (to be wired after Fastify → Express migration) ───────────────
// import EmployeesRouter from "./employees/employees.controller.js";

const HRRouter = express.Router();

// ── API paths handled by this module ─────────────────────────────────────────
// /api/erp/employees/*  → employees (list, get, create, update, delete, permissions, companies)

export default HRRouter;
