export const DEMO_USERS = {
  cashier: {
    email: "cashier@rr-pos.local",
    password: "Cashier@123",
    role: "cashier",
    name: "Maria Santos",
  },
  manager: {
    email: "manager@rr-pos.local",
    password: "Manager@123",
    role: "inventory_manager",
    name: "Eduardo Reyes",
  },
  admin: {
    email: "admin@rr-pos.local",
    password: "Admin@123",
    role: "super_admin",
    name: "Alec Joseph Rivero",
  },
  invited: {
    email: "newstaff@rr-pos.local",
    password: "InitialPassword@123",
    role: "inventory_manager",
    name: "Invited Staff Member",
  },
};

export const SAMPLE_PRODUCT = {
  sku: "TEA-888",
  name: "Organic Jasmine Green Tea",
  category: "Beverages",
  costPrice: "65",
  sellingPrice: "145",
  initialStock: "50",
  lowThreshold: "15",
  description: "Fragrant premium loose leaf jasmine green tea",
};
