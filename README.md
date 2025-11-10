## Description

**Customer Node** is a lightweight server application built with [NestJS](https://github.com/nestjs/nest).  
It represents a client-side node running on a customer’s server, forming part of the **Octopus ecosystem**.

The main purpose of this node is to **receive and execute commands** originating from a trusted source — the **Octopus Controller**.  
Instead of exposing public endpoints for incoming commands, the node **pulls tasks** from Octopus after being pinged.  
This **pull-based communication model** greatly improves security, as no external system sends direct `POST` requests to the node.

---

## Architecture Overview

- **Octopus → Customer Node** communication works via **pinging**.  
  Octopus pings the node, triggering it to fetch pending tasks.  
- The node **does not expose** open endpoints for executing commands.  
- All operations come from a **trusted, verified Octopus source**.  
- Integrations are available for **mock**, **staging**, and **production** cryptocurrency services.

---

## Project setup

```bash
$ npm install
```

---

## Running the app

### Development
Runs the app locally with **mocked crypto exchange services**.  
Useful for testing logic and Octopus communication safely.

```bash
$ npm run dev
```

### Staging
Runs the app connected to **real crypto exchange APIs** but using **test accounts** (real funds, very small amounts).

```bash
$ npm run staging
```

### Production
Runs the app in **production mode**, connected to live accounts and real assets.

```bash
$ npm run production
```

---

## Security

- No public `POST` endpoints — tasks are **fetched**, not **pushed**.  
- Only trusted **Octopus Controller** can trigger task synchronization.  
- Safe configuration separation between environments (`dev`, `staging`, `production`).  
- Designed for **minimum external exposure** and **maximum control**.

---

## Future improvements

- Enhanced job monitoring and reporting back to Octopus.  
- Retry mechanisms for failed tasks.  
- Extended logging and audit features.

---
