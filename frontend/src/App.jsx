import { useEffect, useState } from "react";
import api from "./api";

function App() {

  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCompany();
    loadCustomers();
  }, []);

  async function loadCompany() {
    try {
      const response = await api.get("/company");

      setCompany(response.data);

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "Unable to load company"
      );
    }
  }

  async function loadCustomers() {
    try {
      const response = await api.get("/customers");

      setCustomers(response.data);

    } catch (error) {
      console.error(error);
    }
  }

  if (error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px" }}>

      <h1>Sinarico</h1>

      {company && (
        <div>
          <h2>{company.company}</h2>

          <p>
            Subdomain: {company.subdomain}
          </p>

          <p>
            Database: {company.database}
          </p>
        </div>
      )}

      <hr />

      <h2>Customers</h2>

      {customers.map((customer) => (
        <div key={customer.id}>
          {customer.name}
        </div>
      ))}

    </div>
  );
}

export default App;
