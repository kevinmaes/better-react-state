import { useState, useReducer } from 'react';

// Example 1: Multiple states updated together
export function BadFormWithMultipleStates() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [_isSubmitting, setIsSubmitting] = useState(false);
  const [_errors, setErrors] = useState<Record<string, string>>({});
  const [_submitCount, setSubmitCount] = useState(0);

  const handleSubmit = async () => {
    // Multiple state updates together
    setIsSubmitting(true);
    setErrors({});
    setSubmitCount((prev) => prev + 1);

    try {
      await submitForm({
        name,
        email,
        password,
        isSubmitting: _isSubmitting,
        errors: _errors,
        submitCount: _submitCount,
      });
      // More updates together
      setName('');
      setEmail('');
      setPassword('');
      setIsSubmitting(false);
    } catch (err) {
      setErrors((err as Error & { errors: Record<string, string> }).errors);
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    // Another group of updates
    setName('');
    setEmail('');
    setPassword('');
    setErrors({});
    setSubmitCount(0);
  };

  return (
    <form>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleSubmit}>Submit</button>
      <button onClick={handleReset}>Reset</button>
    </form>
  );
}

// Example 2: Complex conditional state logic
export function BadConditionalStateUpdates() {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = async () => {
    if (status === 'loading') return;

    setStatus('loading');
    setError(null);

    try {
      const result = await fetch('/api/data');
      if (result.ok) {
        setData(await result.json());
        setStatus('success');
        setRetryCount(0);
      } else {
        setStatus('error');
        setError('Failed to fetch');
        if (retryCount < 3) {
          setRetryCount((prev) => prev + 1);
        }
      }
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
      setRetryCount((prev) => prev + 1);
    }
  };

  return <div>{status}</div>;
}

// Example 3: Good - Already using useReducer
type FormAction =
  | { type: 'START_SUBMIT' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errors: Record<string, string> }
  | { type: 'UPDATE_FIELD'; field: string; value: string }
  | { type: 'RESET' };

interface FormState {
  name: string;
  email: string;
  password: string;
  isSubmitting: boolean;
  errors: Record<string, string>;
  submitCount: number;
}

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'START_SUBMIT':
      return {
        ...state,
        isSubmitting: true,
        errors: {},
        submitCount: state.submitCount + 1,
      };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        isSubmitting: false,
        name: '',
        email: '',
        password: '',
      };
    case 'SUBMIT_ERROR':
      return {
        ...state,
        isSubmitting: false,
        errors: action.errors,
      };
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.field]: action.value,
      };
    case 'RESET':
      return {
        name: '',
        email: '',
        password: '',
        isSubmitting: false,
        errors: {},
        submitCount: 0,
      };
    default:
      return state;
  }
};

export function GoodFormWithReducer() {
  const [state, dispatch] = useReducer(formReducer, {
    name: '',
    email: '',
    password: '',
    isSubmitting: false,
    errors: {},
    submitCount: 0,
  });

  const handleSubmit = async () => {
    dispatch({ type: 'START_SUBMIT' });

    try {
      await submitForm(state);
      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (err) {
      dispatch({
        type: 'SUBMIT_ERROR',
        errors: (err as Error & { errors: Record<string, string> }).errors,
      });
    }
  };

  return (
    <form>
      <input
        value={state.name}
        onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'name', value: e.target.value })}
      />
      <button onClick={handleSubmit}>Submit</button>
      <button onClick={() => dispatch({ type: 'RESET' })}>Reset</button>
    </form>
  );
}

// Example 4: Simple component that doesn't need useReducer
export function GoodSimpleComponent() {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div>
      {isVisible && <p>Count: {count}</p>}
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setIsVisible(!isVisible)}>Toggle</button>
    </div>
  );
}

// Helper function
async function submitForm(data: FormState) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.5) {
        resolve(data);
      } else {
        reject({ errors: { form: 'Submission failed' } });
      }
    }, 1000);
  });
}
