import { reactive, ref, onMounted, watchEffect, computed, shallowReactive, onBeforeUnmount, triggerRef } from 'vue';

export const fastClone = <T,>(obj: T): T | undefined =>
  obj === undefined ? undefined : JSON.parse(JSON.stringify(obj));

export function useTina<T extends object>(props: {
  query: string;
  variables: object;
  data: T;
}): { data: T; isClient: boolean } {
  // Create a unique ID from the query
  const stringifiedQuery = JSON.stringify({
    query: props.query,
    variables: props.variables,
  });

  const id = computed(() => hashFromQuery(stringifiedQuery));

  // State management
  const state = shallowReactive({
    data: props.data,
    isClient: false,
    quickEditEnabled: false,
    isInTinaIframe: false,
  });

  // Set the data and check if running on the client
  watchEffect(() => {
    state.isClient = true;
    state.data = props.data;
    // triggerRef(state.data);
  });

  // Function to handle quick edit style and events
  const applyQuickEditStyles = () => {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = `
      [data-tina-field] {
        outline: 2px dashed rgba(34,150,254,0.5);
        transition: box-shadow ease-out 150ms;
      }
      [data-tina-field]:hover {
        box-shadow: inset 100vi 100vh rgba(34,150,254,0.3);
        outline: 2px solid rgba(34,150,254,1);
        cursor: pointer;
      }
      [data-tina-field-overlay] {
        outline: 2px dashed rgba(34,150,254,0.5);
        position: relative;
      }
      [data-tina-field-overlay]:hover {
        cursor: pointer;
        outline: 2px solid rgba(34,150,254,1);
      }
      [data-tina-field-overlay]::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 20;
        transition: opacity ease-out 150ms;
        background-color: rgba(34,150,254,0.3);
        opacity: 0;
      }
      [data-tina-field-overlay]:hover::after {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
    document.body.classList.add('__tina-quick-editing-enabled');

    const mouseDownHandler = (e: MouseEvent) => {
      const attributeNames = (e.target as HTMLElement).getAttributeNames();
      const tinaAttribute = attributeNames.find((name) =>
        name.startsWith('data-tina-field')
      );
      let fieldName;

      if (tinaAttribute) {
        e.preventDefault();
        e.stopPropagation();
        fieldName = (e.target as HTMLElement).getAttribute(tinaAttribute);
      } else {
        const ancestor = (e.target as HTMLElement).closest('[data-tina-field], [data-tina-field-overlay]');
        if (ancestor) {
          const ancestorAttributeNames = ancestor.getAttributeNames();
          const ancestorTinaAttribute = ancestorAttributeNames.find((name) =>
            name.startsWith('data-tina-field')
          );
          if (ancestorTinaAttribute) {
            e.preventDefault();
            e.stopPropagation();
            fieldName = ancestor.getAttribute(ancestorTinaAttribute);
          }
        }
      }

      if (fieldName) {
        if (state.isInTinaIframe) {
          parent.postMessage(
            { type: 'field:selected', fieldName: fieldName },
            window.location.origin
          );
        }
      }
    };

    document.addEventListener('click', mouseDownHandler, true);

    // Clean up when the component is destroyed
    onBeforeUnmount(() => {
      document.removeEventListener('click', mouseDownHandler, true);
      document.body.classList.remove('__tina-quick-editing-enabled');
      style.remove();
    });
  };

  // Watch the state of quickEditEnabled and apply styles if necessary
  watchEffect(() => {
    if (state.quickEditEnabled) {
      applyQuickEditStyles();
    }
  });

  watchEffect(() => {
        //? Note there seems to be a bug with the props we are sending to the parent window
        const clonedProps = fastClone(props);

        parent.postMessage(
          { type: "open", ...clonedProps, id: id.value },
          window.location.origin
        );
    window.addEventListener('message', (event) => {
      if (event.data.type === 'quickEditEnabled') {
        state.quickEditEnabled = event.data.value;
      }
      if (event.data.id === id && event.data.type === 'updateData') {
        state.data = event.data.data;
        state.isInTinaIframe = true;
        // Ensure we still have a tina-field on the page
        const anyTinaField = document.querySelector('[data-tina-field]')
        if (anyTinaField) {
          parent.postMessage(
            { type: 'quick-edit', value: true },
            window.location.origin
          )
        } else {
          parent.postMessage(
            { type: 'quick-edit', value: false },
            window.location.origin
          )
        }
      }
    })

    return () => {
      parent.postMessage({ type: 'close', id }, window.location.origin)
    }
  })


  console.log('Tina initialized with ID:', id.value);
  console.log('Tina initialized with data:', state.data);
  console.log('Tina initialized on client:', state.isClient);
  
  
  
  return { data: state.data, isClient: state.isClient };
}

// Helper function to hash the query
function hashFromQuery(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) & 0xffffffff;
  }
  const nonNegativeHash = Math.abs(hash);
  return nonNegativeHash.toString(36);
}
