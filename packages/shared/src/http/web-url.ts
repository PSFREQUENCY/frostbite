import { z } from "zod";

// An address on the web: `http` or `https` and nothing else. A bare URL check accepts every scheme there is, among them the ones that run
// script (`javascript:`) or carry a whole document (`data:`), so anything a person types that may later be shown or followed takes this.
export const webUrlSchema = z.url({ protocol: /^https?$/u });
