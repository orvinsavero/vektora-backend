// 1. Export Shared Database Models & Constraints
export * from "./catalog.schema";
export * from "./catalog.constants";

// 2. Export Request Payloads / Form-validators
export * from "./_shared/request";
export * from "./_shared/response";

// 3. Export Taxonomy Sub-Domain Layers
export { CategoriesService } from "./categories/categories.service";
export { getCategoriesController } from "./categories/controllers/get-categories.controller";

// 4. Export Talent Sub-Domain Layers
export { TalentsService } from "./talents/talents.service";
export { registerTalentController } from "./talents/controllers/register-talent.controller";
export { getTalentController } from "./talents/controllers/get-talent.controller";
export { getSelfTalentController } from "./talents/controllers/get-self-talent.controller";
export { updateTalentProfileController } from "./talents/controllers/update-talent.controller";

// 5. Export Portfolio Sub-Domain Layers
export { PortfoliosService } from "./portfolios/portfolios.service";
export { createPortfolioController } from "./portfolios/controllers/create-portfolio.controller";
export { updatePortfolioController } from "./portfolios/controllers/update-portfolio.controller";
export { deletePortfolioController } from "./portfolios/controllers/delete-portfolio.controller";
export { getPortfolioController } from "./portfolios/controllers/get-portfolio.controller";
export { getTalentPortfoliosController } from "./portfolios/controllers/get-talent-portfolios";
