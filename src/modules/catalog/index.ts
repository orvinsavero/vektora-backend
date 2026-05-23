export * from "./catalog.constants";
export * from "./catalog.schema";
export * from "./services/catalog.service";

export * from "./request";
export * from "./response";

export { registerTalentController } from "./controllers/register-talent";
export { getTalentController } from "./controllers/get-talent";
export { getSelfTalentController } from "./controllers/get-self-talent";
export { updateTalentProfileController } from "./controllers/update-talent";
export { getCategoriesController } from "./controllers/get-categories";
export { createPortfolioController } from "./controllers/create-portfolio";
export { updatePortfolioController } from "./controllers/update-portfolio";
