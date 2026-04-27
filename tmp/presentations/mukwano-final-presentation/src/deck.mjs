import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Presentation,
  PresentationFile,
  row,
  column,
  layers,
  panel,
  text,
  rule,
  fill,
  hug,
  wrap,
  grow,
  fixed,
} from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(__dirname, "..");
const scratchDir = path.join(workspaceDir, "scratch");
const outputDir = path.join(workspaceDir, "output");
const previewDir = path.join(scratchDir, "previews");

const rootDir = "/Users/levicheptoyek/Mukwano-";
const asset = (...parts) => path.join(rootDir, ...parts);

const COLORS = {
  navy: "#071526",
  navy2: "#0F2740",
  navy3: "#163A5F",
  cream: "#F5F1E8",
  gold: "#F0A500",
  goldSoft: "#F6C55B",
  mint: "#B8E6D3",
  mintDeep: "#7CCFB1",
  slate: "#A7B4C1",
  white: "#FFFFFF",
  line: "#284868",
  red: "#E67D7D",
};

const SLIDE = { width: 1920, height: 1080 };
const FOOTER = "Mukwano | Final Project Presentation";

function bullet(value, color = COLORS.cream, size = 24, width = 660) {
  return text(`• ${value}`, {
    width: wrap(width),
    height: hug,
    style: {
      fontSize: size,
      color,
    },
  });
}

function caption(value, color = COLORS.slate) {
  return text(value, {
    width: fill,
    height: hug,
    style: {
      fontSize: 16,
      color,
    },
  });
}

function sectionTitle(eyebrow, title, subtitle) {
  return column({ width: fill, height: hug, gap: 10 }, [
    text(eyebrow, {
      width: fill,
      height: hug,
      style: { fontSize: 18, color: COLORS.goldSoft, bold: true },
    }),
    text(title, {
      width: wrap(1200),
      height: hug,
      style: { fontSize: 42, color: COLORS.white, bold: true },
    }),
    text(subtitle, {
      width: wrap(1200),
      height: hug,
      style: { fontSize: 22, color: COLORS.slate },
    }),
  ]);
}

function statCard(title, body, accent = COLORS.gold) {
  return panel(
    {
      width: grow(1),
      height: fill,
      padding: 24,
      fill: COLORS.navy2,
      borderRadius: 22,
      line: { color: COLORS.line, width: 1 },
    },
    column({ width: fill, height: fill, gap: 10 }, [
      rule({ width: fixed(72), stroke: accent, weight: 5 }),
      text(title, {
        width: fill,
        height: hug,
        style: { fontSize: 24, color: COLORS.white, bold: true },
      }),
      text(body, {
        width: wrap(330),
        height: hug,
        style: { fontSize: 18, color: COLORS.mint },
      }),
    ]),
  );
}

function featureCard(index, title, bullets, accent = COLORS.goldSoft) {
  return panel(
    {
      width: grow(1),
      height: fill,
      padding: 22,
      fill: "#0D2237",
      borderRadius: 20,
      line: { color: COLORS.line, width: 1 },
    },
    column({ width: fill, height: fill, gap: 10 }, [
      text(String(index).padStart(2, "0"), {
        width: fill,
        height: hug,
        style: { fontSize: 18, color: accent, bold: true },
      }),
      text(title, {
        width: wrap(280),
        height: hug,
        style: { fontSize: 22, color: COLORS.white, bold: true },
      }),
      ...bullets.map((item) => bullet(item, COLORS.slate, 16, 290)),
    ]),
  );
}

function numberedStep(num, title, detail, accent = COLORS.gold) {
  return panel(
    {
      width: grow(1),
      height: fill,
      padding: 18,
      fill: COLORS.navy2,
      borderRadius: 18,
      line: { color: COLORS.line, width: 1 },
    },
    column({ width: fill, height: fill, gap: 8 }, [
      text(String(num), {
        width: fill,
        height: hug,
        style: { fontSize: 28, color: accent, bold: true },
      }),
      text(title, {
        width: wrap(220),
        height: hug,
        style: { fontSize: 20, color: COLORS.white, bold: true },
      }),
      text(detail, {
        width: wrap(230),
        height: hug,
        style: { fontSize: 15, color: COLORS.slate },
      }),
    ]),
  );
}

function footer() {
  return row({ width: fill, height: hug }, [
    text(FOOTER, {
      width: grow(1),
      height: hug,
      style: { fontSize: 14, color: COLORS.slate },
    }),
    text("Demo mode build | governance-first MVP", {
      width: hug,
      height: hug,
      style: { fontSize: 14, color: COLORS.slate },
    }),
  ]);
}

function addTitleSlide(presentation) {
  const slide = presentation.slides.add();
  slide.compose(
    layers({ width: fill, height: fill }, [
      panel({ width: fill, height: fill, fill: COLORS.navy }),
      row({ width: fill, height: fill, padding: 72, gap: 42 }, [
        column({ width: grow(1.05), height: fill, gap: 18 }, [
          text("CS Final Project", {
            width: fill,
            height: hug,
            style: { fontSize: 20, color: COLORS.goldSoft, bold: true },
          }),
          text("Mukwano", {
            width: fill,
            height: hug,
            style: { fontSize: 80, color: COLORS.white, bold: true },
          }),
          text("Governance-first community funding for diaspora circles", {
            width: wrap(720),
            height: hug,
            style: { fontSize: 30, color: COLORS.mint },
          }),
          column({ width: fill, height: hug, gap: 10 }, [
            bullet("Users form circles, contribute funds, vote on proposals, and track funded projects.", COLORS.cream, 24, 720),
            bullet("The server enforces permissions, balance mutations, and vote outcomes so the UI cannot override governance.", COLORS.cream, 24, 720),
            bullet("Today’s presentation covers the system, key features, and the updates added after the initial project.", COLORS.cream, 24, 720),
          ]),
          panel(
            {
              width: wrap(740),
              height: hug,
              padding: 20,
              fill: COLORS.navy2,
              borderRadius: 20,
              line: { color: COLORS.line, width: 1 },
            },
            text("Presentation plan: 5-7 minute slide overview, then a 5-8 minute live demo across signup, circles, contributions, voting, and project execution.", {
              width: fill,
              height: hug,
              style: { fontSize: 20, color: COLORS.goldSoft },
            }),
          ),
          text("Team Mukwano", {
            width: fill,
            height: hug,
            style: { fontSize: 18, color: COLORS.slate },
          }),
        ]),
        column({ width: grow(0.95), height: fill, gap: 18 }, [
          panel(
            {
              width: fill,
              height: fixed(170),
              padding: 24,
              fill: COLORS.cream,
              borderRadius: 26,
            },
            row({ width: fill, height: fill, gap: 22 }, [
              panel(
                {
                  width: fixed(130),
                  height: fixed(130),
                  fill: COLORS.navy,
                  borderRadius: 28,
                },
                column({ width: fill, height: fill, padding: 16, gap: 6 }, [
                  text("M", {
                    width: fill,
                    height: hug,
                    style: { fontSize: 62, color: COLORS.goldSoft, bold: true, alignment: "center" },
                  }),
                  text("Mukwano", {
                    width: fill,
                    height: hug,
                    style: { fontSize: 18, color: COLORS.cream, alignment: "center" },
                  }),
                ]),
              ),
              column({ width: grow(1), height: fill, gap: 8 }, [
                text("Build home together.", {
                  width: fill,
                  height: hug,
                  style: { fontSize: 36, color: COLORS.navy, bold: true },
                }),
                text("Friendship, accountability, and collective action are the product story behind the platform.", {
                  width: wrap(420),
                  height: hug,
                  style: { fontSize: 20, color: COLORS.navy3 },
                }),
              ]),
            ]),
          ),
          panel(
            {
              width: fill,
              height: grow(1),
              padding: 28,
              fill: COLORS.navy2,
              borderRadius: 28,
              line: { color: COLORS.line, width: 1 },
            },
            column({ width: fill, height: fill, gap: 18 }, [
              text("Three product pillars", {
                width: fill,
                height: hug,
                style: { fontSize: 24, color: COLORS.goldSoft, bold: true },
              }),
              row({ width: fill, height: fixed(170), gap: 14 }, [
                panel(
                  { width: grow(1), height: fill, padding: 18, fill: "#153552", borderRadius: 22 },
                  column({ width: fill, height: fill, gap: 8 }, [
                    text("Trust", { width: fill, height: hug, style: { fontSize: 28, color: COLORS.white, bold: true } }),
                    text("Clear permissions and protected workflows.", { width: wrap(180), height: hug, style: { fontSize: 18, color: COLORS.mint } }),
                  ]),
                ),
                panel(
                  { width: grow(1), height: fill, padding: 18, fill: "#173B5C", borderRadius: 22 },
                  column({ width: fill, height: fill, gap: 8 }, [
                    text("Governance", { width: fill, height: hug, style: { fontSize: 28, color: COLORS.white, bold: true } }),
                    text("Vote-driven proposals with circle-defined rules.", { width: wrap(180), height: hug, style: { fontSize: 18, color: COLORS.mint } }),
                  ]),
                ),
                panel(
                  { width: grow(1), height: fill, padding: 18, fill: "#1A4166", borderRadius: 22 },
                  column({ width: fill, height: fill, gap: 8 }, [
                    text("Execution", { width: fill, height: hug, style: { fontSize: 28, color: COLORS.white, bold: true } }),
                    text("Fund projects, track progress, and close the loop.", { width: wrap(180), height: hug, style: { fontSize: 18, color: COLORS.mint } }),
                  ]),
                ),
              ]),
              panel(
                { width: fill, height: grow(1), padding: 20, fill: "#0C1F31", borderRadius: 22 },
                text("Community money should move with the same visibility as community trust.", {
                  width: wrap(540),
                  height: hug,
                  style: { fontSize: 30, color: COLORS.cream, bold: true },
                }),
              ),
            ]),
          ),
          footer(),
        ]),
      ]),
    ]),
    { frame: { left: 0, top: 0, width: SLIDE.width, height: SLIDE.height }, baseUnit: 8 },
  );
}

function addProblemSlide(presentation) {
  const slide = presentation.slides.add();
  slide.compose(
    column({ width: fill, height: fill, padding: 70, gap: 26 }, [
      sectionTitle(
        "01 | Problem and Product",
        "Diaspora groups already pool money. The hard part is trust, coordination, and transparent governance.",
        "Mukwano turns a familiar community practice into a traceable digital workflow."
      ),
      row({ width: fill, height: grow(1), gap: 28 }, [
        column({ width: grow(0.95), height: fill, gap: 18 }, [
          panel(
            {
              width: fill,
              height: grow(1),
              padding: 28,
              fill: COLORS.cream,
              borderRadius: 26,
            },
            column({ width: fill, height: fill, gap: 14 }, [
              text("Core challenge", {
                width: fill,
                height: hug,
                style: { fontSize: 22, color: COLORS.navy3, bold: true },
              }),
              text("Informal community fundraising breaks down when records are fragmented, approvals are ambiguous, and members cannot verify where the money went.", {
                width: wrap(520),
                height: hug,
                style: { fontSize: 31, color: COLORS.navy, bold: true },
              }),
              text("That makes accountability social instead of system-enforced.", {
                width: wrap(500),
                height: hug,
                style: { fontSize: 22, color: COLORS.navy3 },
              }),
            ]),
          ),
          row({ width: fill, height: fixed(170), gap: 16 }, [
            statCard("Diaspora pain point", "Spreadsheet records, group chats, and verbal approvals make contributions and decisions hard to audit.", COLORS.red),
            statCard("Mukwano response", "A single platform tracks members, contributions, proposals, votes, and funded projects end to end.", COLORS.mintDeep),
          ]),
        ]),
        column({ width: grow(1.05), height: fill, gap: 18 }, [
          panel(
            {
              width: fill,
              height: fixed(286),
              padding: 26,
              fill: COLORS.navy2,
              borderRadius: 24,
              line: { color: COLORS.line, width: 1 },
            },
            column({ width: fill, height: fill, gap: 12 }, [
              text("What the platform must guarantee", {
                width: fill,
                height: hug,
                style: { fontSize: 24, color: COLORS.white, bold: true },
              }),
              bullet("Only approved members can participate in circle actions.", COLORS.mint, 19, 520),
              bullet("Every contribution must be reviewed and reflected in the treasury ledger.", COLORS.mint, 19, 520),
              bullet("Proposal outcomes depend on quorum and approval rules stored on the server.", COLORS.mint, 19, 520),
              bullet("Projects only move forward after a passed vote and available treasury balance.", COLORS.mint, 19, 520),
            ]),
          ),
          panel(
            {
              width: fill,
              height: grow(1),
              padding: 22,
              fill: "#0C1F31",
              borderRadius: 24,
              line: { color: COLORS.line, width: 1 },
            },
            column({ width: fill, height: fill, gap: 16 }, [
              text("Governance loop", {
                width: fill,
                height: hug,
                style: { fontSize: 24, color: COLORS.goldSoft, bold: true },
              }),
              row({ width: fill, height: fill, gap: 14 }, [
                numberedStep(1, "Contribute", "Member submits contribution and optional proof.", COLORS.goldSoft),
                numberedStep(2, "Verify", "Admin approves; ledger and treasury update.", COLORS.mintDeep),
                numberedStep(3, "Vote", "Members vote on proposals under stored rules.", COLORS.goldSoft),
                numberedStep(4, "Execute", "Passed proposals become projects with progress updates.", COLORS.mintDeep),
              ]),
            ]),
          ),
        ]),
      ]),
      footer(),
    ]),
    { frame: { left: 0, top: 0, width: SLIDE.width, height: SLIDE.height }, baseUnit: 8 },
  );
}

function addArchitectureSlide(presentation) {
  const slide = presentation.slides.add();
  slide.compose(
    column({ width: fill, height: fill, padding: 70, gap: 24 }, [
      sectionTitle(
        "02 | Architecture",
        "A full-stack TypeScript app with a thin client and a rule-heavy backend.",
        "Most trust guarantees live in the API and database layer, not in browser logic."
      ),
      row({ width: fill, height: grow(1), gap: 28 }, [
        column({ width: grow(1), height: fill, gap: 18 }, [
          panel(
            {
              width: fill,
              height: grow(1),
              padding: 24,
              fill: COLORS.cream,
              borderRadius: 24,
            },
            column({ width: fill, height: fill, gap: 14 }, [
              text("System stack", {
                width: fill,
                height: hug,
                style: { fontSize: 24, color: COLORS.navy3, bold: true },
              }),
              statCard("Frontend", "React + TypeScript + Vite + TanStack Query. Handles routing, forms, and views for circles, proposals, and projects.", COLORS.gold),
              statCard("Backend", "Fastify + TypeScript services. Enforces auth, roles, ledger updates, proposal rules, and admin operations.", COLORS.mintDeep),
              statCard("Data layer", "Prisma + PostgreSQL. Stores users, memberships, contributions, votes, proposals, projects, notifications, and audit logs.", COLORS.goldSoft),
            ]),
          ),
        ]),
        column({ width: grow(1), height: fill, gap: 18 }, [
          panel(
            {
              width: fill,
              height: fixed(314),
              padding: 26,
              fill: COLORS.navy2,
              borderRadius: 24,
              line: { color: COLORS.line, width: 1 },
            },
            column({ width: fill, height: fill, gap: 12 }, [
              text("Auth + trust model", {
                width: fill,
                height: hug,
                style: { fontSize: 24, color: COLORS.white, bold: true },
              }),
              bullet("JWT access tokens (15 min) + rotating refresh tokens (30 days).", COLORS.mint, 19, 520),
              bullet("Email verification gate before onboarding and protected app usage.", COLORS.mint, 19, 520),
              bullet("Optional TOTP step-up paths for sensitive account actions.", COLORS.mint, 19, 520),
              bullet("Audit logs and notifications track major governance events.", COLORS.mint, 19, 520),
            ]),
          ),
          panel(
            {
              width: fill,
              height: grow(1),
              padding: 26,
              fill: "#0C1F31",
              borderRadius: 24,
              line: { color: COLORS.line, width: 1 },
            },
            column({ width: fill, height: fill, gap: 14 }, [
              text("Why the backend matters", {
                width: fill,
                height: hug,
                style: { fontSize: 24, color: COLORS.goldSoft, bold: true },
              }),
              text("The UI can request actions, but it does not decide whether they are valid.", {
                width: wrap(520),
                height: hug,
                style: { fontSize: 26, color: COLORS.white, bold: true },
              }),
              bullet("Circle membership and role checks happen in services before every protected action.", COLORS.slate, 18, 520),
              bullet("Contribution verification writes to an append-style ledger and updates treasury balance.", COLORS.slate, 18, 520),
              bullet("Proposal closing calculates quorum and approval percentages on the server.", COLORS.slate, 18, 520),
              bullet("Project funding only starts if the treasury can cover the budget.", COLORS.slate, 18, 520),
            ]),
          ),
        ]),
      ]),
      footer(),
    ]),
    { frame: { left: 0, top: 0, width: SLIDE.width, height: SLIDE.height }, baseUnit: 8 },
  );
}

function addUserFlowSlide(presentation) {
  const slide = presentation.slides.add();
  slide.compose(
    column({ width: fill, height: fill, padding: 70, gap: 24 }, [
      sectionTitle(
        "03 | Core User Flow",
        "From signup to funded project, the app follows a clear governance pipeline.",
        "This is the same path we will show during the live demo."
      ),
      panel(
        {
          width: fill,
          height: fixed(290),
          padding: 24,
          fill: COLORS.navy2,
          borderRadius: 24,
          line: { color: COLORS.line, width: 1 },
        },
        row({ width: fill, height: fill, gap: 10 }, [
          numberedStep(1, "Signup", "Create account and receive access + refresh token pair.", COLORS.goldSoft),
          numberedStep(2, "Verify", "Confirm email before onboarding and protected flows.", COLORS.mintDeep),
          numberedStep(3, "Onboard", "Choose sector + residence to personalize the app.", COLORS.goldSoft),
          numberedStep(4, "Join or Create", "Enter a circle via invite or create a new one.", COLORS.mintDeep),
          numberedStep(5, "Contribute + Vote", "Submit funds, review proposals, and cast votes.", COLORS.goldSoft),
          numberedStep(6, "Project Tracking", "Watch approved work move into execution and updates.", COLORS.mintDeep),
        ]),
      ),
      row({ width: fill, height: grow(1), gap: 22 }, [
        panel(
          {
            width: grow(1),
            height: fill,
            padding: 24,
            fill: COLORS.cream,
            borderRadius: 22,
          },
          column({ width: fill, height: fill, gap: 12 }, [
            text("User-facing moments", {
              width: fill,
              height: hug,
              style: { fontSize: 24, color: COLORS.navy3, bold: true },
            }),
            bullet("Dashboard summarizes circles, pending contributions, unvoted proposals, and recent activity.", COLORS.navy3, 18, 520),
            bullet("Explore page exposes public circles and invite-code entry.", COLORS.navy3, 18, 520),
            bullet("Circle detail page becomes the operational hub for members and admins.", COLORS.navy3, 18, 520),
            bullet("Portfolio and admin pages extend visibility beyond the main circle workflow.", COLORS.navy3, 18, 520),
          ]),
        ),
        panel(
          {
            width: grow(1),
            height: fill,
            padding: 24,
            fill: "#0C1F31",
            borderRadius: 22,
            line: { color: COLORS.line, width: 1 },
          },
          column({ width: fill, height: fill, gap: 12 }, [
            text("Server-enforced checks", {
              width: fill,
              height: hug,
              style: { fontSize: 24, color: COLORS.goldSoft, bold: true },
            }),
            bullet("Only verified accounts can move past onboarding gates.", COLORS.slate, 18, 520),
            bullet("Only members can access circle resources; only admins can verify contributions or change roles.", COLORS.slate, 18, 520),
            bullet("Voting, proposal closing, and project funding all depend on stored governance rules and treasury state.", COLORS.slate, 18, 520),
            bullet("Notifications and audit logs record each important transition.", COLORS.slate, 18, 520),
          ]),
        ),
      ]),
      footer(),
    ]),
    { frame: { left: 0, top: 0, width: SLIDE.width, height: SLIDE.height }, baseUnit: 8 },
  );
}

function addFeaturesSlide(presentation) {
  const slide = presentation.slides.add();
  slide.compose(
    column({ width: fill, height: fill, padding: 68, gap: 22 }, [
      sectionTitle(
        "04 | Main Features",
        "The MVP already covers the full governance cycle, not just isolated screens.",
        "Each feature supports trust, traceability, or execution."
      ),
      row({ width: fill, height: fixed(350), gap: 18 }, [
        featureCard(1, "Circle management", ["Create circles", "Manage members + roles"], COLORS.goldSoft),
        featureCard(2, "Invite + explore", ["Public circle directory", "Join by invite code"], COLORS.mintDeep),
        featureCard(3, "Contribution workflow", ["Submit payments", "Attach proof and verify"], COLORS.goldSoft),
      ]),
      row({ width: fill, height: fixed(350), gap: 18 }, [
        featureCard(4, "Proposal governance", ["Create proposals", "Vote and close by rules"], COLORS.mintDeep),
        featureCard(5, "Project execution", ["Create funded projects", "Post execution updates"], COLORS.goldSoft),
        featureCard(6, "Admin + reporting", ["Portfolio summaries", "Admin oversight and analytics"], COLORS.mintDeep),
      ]),
      footer(),
    ]),
    { frame: { left: 0, top: 0, width: SLIDE.width, height: SLIDE.height }, baseUnit: 8 },
  );
}

function addUpdatesSlide(presentation) {
  const slide = presentation.slides.add();
  slide.compose(
    column({ width: fill, height: fill, padding: 70, gap: 24 }, [
      sectionTitle(
        "05 | Updates After the Initial Project",
        "The current build is significantly more complete than the first submission.",
        "We expanded both user-facing workflows and backend governance depth."
      ),
      row({ width: fill, height: grow(1), gap: 24 }, [
        panel(
          {
            width: grow(0.78),
            height: fill,
            padding: 24,
            fill: COLORS.cream,
            borderRadius: 24,
          },
          column({ width: fill, height: fill, gap: 12 }, [
            text("Initial project scope", {
              width: fill,
              height: hug,
              style: { fontSize: 24, color: COLORS.navy3, bold: true },
            }),
            bullet("Core circle and contribution idea.", COLORS.navy3, 19, 430),
            bullet("Foundational authentication and routing.", COLORS.navy3, 19, 430),
            bullet("Basic proposal/project workflow concept.", COLORS.navy3, 19, 430),
            text("Current project extends that into a fuller product experience.", {
              width: wrap(420),
              height: hug,
              style: { fontSize: 20, color: COLORS.navy3, bold: true },
            }),
          ]),
        ),
        column({ width: grow(1.22), height: fill, gap: 16 }, [
          statCard("Stronger auth + onboarding", "Email verification, password reset, refresh-token rotation, and onboarding steps now shape the first-run experience.", COLORS.goldSoft),
          statCard("Broader discovery + access", "Public explore listings, circle privacy settings, invite-code join flow, and membership-request management were added.", COLORS.mintDeep),
          statCard("Richer governance operations", "Contribution proof uploads, treasury balances, proposal voting, proposal closing, and project execution are integrated end to end.", COLORS.goldSoft),
          statCard("Operational visibility", "Portfolio pages, notification flows, audit logging, support flags, analytics, and admin dashboards expanded the system beyond the MVP shell.", COLORS.mintDeep),
        ]),
      ]),
      footer(),
    ]),
    { frame: { left: 0, top: 0, width: SLIDE.width, height: SLIDE.height }, baseUnit: 8 },
  );
}

function addDemoSlide(presentation) {
  const slide = presentation.slides.add();
  slide.compose(
    column({ width: fill, height: fill, padding: 70, gap: 24 }, [
      sectionTitle(
        "06 | Live Demo Plan",
        "Our demo will follow one continuous story instead of jumping between unrelated pages.",
        "That keeps the audience focused on the workflow and the updates we added."
      ),
      row({ width: fill, height: grow(1), gap: 22 }, [
        panel(
          {
            width: grow(1.05),
            height: fill,
            padding: 26,
            fill: COLORS.navy2,
            borderRadius: 24,
            line: { color: COLORS.line, width: 1 },
          },
          column({ width: fill, height: fill, gap: 12 }, [
            text("Demo sequence (5-8 min)", {
              width: fill,
              height: hug,
              style: { fontSize: 24, color: COLORS.white, bold: true },
            }),
            bullet("Login with a prepared account and show the dashboard summary.", COLORS.mint, 19, 520),
            bullet("Create or open a circle and explain roles, treasury, and governance settings.", COLORS.mint, 19, 520),
            bullet("Submit a contribution, then verify it as an admin to show the balance update.", COLORS.mint, 19, 520),
            bullet("Create a proposal, cast votes, and show how a passed proposal becomes a project.", COLORS.mint, 19, 520),
            bullet("Open the project page and show progress updates, portfolio visibility, or admin tooling.", COLORS.mint, 19, 520),
          ]),
        ),
        panel(
          {
            width: grow(0.95),
            height: fill,
            padding: 26,
            fill: COLORS.cream,
            borderRadius: 24,
          },
          column({ width: fill, height: fill, gap: 12 }, [
            text("What the class should notice", {
              width: fill,
              height: hug,
              style: { fontSize: 24, color: COLORS.navy3, bold: true },
            }),
            bullet("The same user journey touches frontend, backend, and database-backed state.", COLORS.navy3, 19, 450),
            bullet("Governance decisions are not simulated in the UI alone; they change system state.", COLORS.navy3, 19, 450),
            bullet("The post-initial-project updates appear in the verification, invite, portfolio, and admin flows.", COLORS.navy3, 19, 450),
            bullet("If a live action is slow, we can still show the resulting screens and explain the server logic behind them.", COLORS.navy3, 19, 450),
            text("End on the project value: transparency + collective action for diaspora communities.", {
              width: wrap(430),
              height: hug,
              style: { fontSize: 22, color: COLORS.navy, bold: true },
            }),
          ]),
        ),
      ]),
      footer(),
    ]),
    { frame: { left: 0, top: 0, width: SLIDE.width, height: SLIDE.height }, baseUnit: 8 },
  );
}

async function saveBlob(blob, filePath) {
  if (blob && typeof blob.save === "function") {
    await blob.save(filePath);
    return;
  }
  if (blob && typeof blob.arrayBuffer === "function") {
    const buffer = Buffer.from(await blob.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    return;
  }
  if (blob?.data) {
    await fs.writeFile(filePath, Buffer.from(blob.data));
    return;
  }
  throw new Error(`Unsupported export object for ${filePath}`);
}

async function exportPreviews(presentation) {
  await fs.mkdir(previewDir, { recursive: true });
  const paths = [];
  for (let i = 0; i < presentation.slides.count; i += 1) {
    const slide = presentation.slides.getItem(i);
    const blob = await slide.export({ format: "png" });
    const filePath = path.join(previewDir, `slide-${String(i + 1).padStart(2, "0")}.png`);
    await saveBlob(blob, filePath);
    paths.push(filePath);
  }
  return paths;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(scratchDir, { recursive: true });

  const presentation = Presentation.create({
    slideSize: SLIDE,
  });

  addTitleSlide(presentation);
  addProblemSlide(presentation);
  addArchitectureSlide(presentation);
  addUserFlowSlide(presentation);
  addFeaturesSlide(presentation);
  addUpdatesSlide(presentation);
  addDemoSlide(presentation);

  const pptxBlob = await PresentationFile.exportPptx(presentation);
  await saveBlob(pptxBlob, path.join(outputDir, "output.pptx"));

  const previewPaths = await exportPreviews(presentation);
  await fs.writeFile(
    path.join(scratchDir, "export-manifest.json"),
    JSON.stringify(
      {
        pptx: path.join(outputDir, "output.pptx"),
        previews: previewPaths,
        slideCount: previewPaths.length,
      },
      null,
      2,
    ),
  );
}

await main();
