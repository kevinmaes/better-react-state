import React, { useState } from 'react';

// ❌ Bad: Complex registration form with many individual useState calls (should trigger warning)
export function ComplexRegistrationForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [touchedEmail, setTouchedEmail] = useState(false);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPhone('');
    setAddress('');
    setCity('');
    setZipCode('');
    setEmailError('');
    setPasswordError('');
    setTouchedEmail(false);
  };

  return (
    <form>
      <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input value={password} onChange={(e) => setPassword(e.target.value)} />
      <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input value={address} onChange={(e) => setAddress(e.target.value)} />
      <input value={city} onChange={(e) => setCity(e.target.value)} />
      <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
      <button type="button" onClick={resetForm}>
        Reset
      </button>
    </form>
  );
}

// ❌ Bad: Very complex form with 12+ states (should trigger error)
export function VeryComplexForm() {
  // Personal info
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');

  // Work info
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [workEmail, setWorkEmail] = useState('');

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [addressError, setAddressError] = useState('');

  return (
    <form>
      <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      {/* ... more inputs */}
    </form>
  );
}

// ❌ Bad: Form with validation patterns
export function FormWithValidation() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Validation states
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  return (
    <form>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      {/* ... */}
    </form>
  );
}

// ✅ Good: Simple form with few states (should not trigger)
export function SimpleContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
      <button type="submit" disabled={isSubmitting}>
        Submit
      </button>
    </form>
  );
}

// ✅ Good: Grouped state approach
export function GroupedStateForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form>
      <input
        value={formData.firstName}
        onChange={(e) => updateField('firstName', e.target.value)}
      />
      {/* ... */}
    </form>
  );
}

// ❌ Bad: Non-form states mixed with form states (should not trigger)
export function MixedStatesComponent() {
  // Non-form states
  const [isLoading, setIsLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // Only a few form fields
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');

  return (
    <div>
      <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
        <option value="all">All</option>
      </select>
      {/* ... */}
    </div>
  );
}

// ❌ Bad: Shipping/Billing form pattern
export function ShippingBillingForm() {
  // Shipping address
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingZip, setShippingZip] = useState('');

  // Billing address
  const [billingName, setBillingName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');

  return (
    <form>
      <h3>Shipping Address</h3>
      <input value={shippingName} onChange={(e) => setShippingName(e.target.value)} />
      <input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
      <input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} />
      <input value={shippingState} onChange={(e) => setShippingState(e.target.value)} />
      <input value={shippingZip} onChange={(e) => setShippingZip(e.target.value)} />

      <h3>Billing Address</h3>
      <input value={billingName} onChange={(e) => setBillingName(e.target.value)} />
      <input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
      <input value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
      <input value={billingState} onChange={(e) => setBillingState(e.target.value)} />
      <input value={billingZip} onChange={(e) => setBillingZip(e.target.value)} />
    </form>
  );
}
