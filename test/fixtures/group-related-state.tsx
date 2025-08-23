import React, { useState } from 'react';

// Example 1: Form fields that should be grouped
export function BadUserForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  return (
    <form>
      <input value={firstName} onChange={e => setFirstName(e.target.value)} />
      <input value={lastName} onChange={e => setLastName(e.target.value)} />
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <input value={phone} onChange={e => setPhone(e.target.value)} />
    </form>
  );
}

// Example 2: Product details that should be grouped
export function BadProductCard() {
  const [productId, setProductId] = useState(0);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState(0);
  const [productQuantity, setProductQuantity] = useState(1);
  
  return (
    <div>
      <h2>{productName}</h2>
      <p>${productPrice}</p>
      <p>Quantity: {productQuantity}</p>
    </div>
  );
}

// Example 3: Good - Already grouped
export function GoodUserForm() {
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  return (
    <form>
      <input 
        value={user.firstName} 
        onChange={e => setUser({...user, firstName: e.target.value})} 
      />
    </form>
  );
}