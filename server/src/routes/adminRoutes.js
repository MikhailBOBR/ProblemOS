import { handleAdminCaseRoutes } from "./adminCaseRoutes.js";
import { handleAdminCategoryRoutes } from "./adminCategoryRoutes.js";
import { handleAdminOpsRoutes } from "./adminOpsRoutes.js";
import { handleAdminTemplateRoutes } from "./adminTemplateRoutes.js";
import { handleAdminUserRoutes } from "./adminUserRoutes.js";

export async function handleAdminRoutes(req, res, store, context) {
  if (await handleAdminOpsRoutes(req, res, store, context)) return true;
  if (await handleAdminUserRoutes(req, res, store, context)) return true;
  if (await handleAdminCaseRoutes(req, res, store, context)) return true;
  if (await handleAdminCategoryRoutes(req, res, store, context)) return true;
  if (await handleAdminTemplateRoutes(req, res, store, context)) return true;

  return false;
}
