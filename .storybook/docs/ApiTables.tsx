import type { JSX } from 'react';
import {
  attributeType,
  getAttributes,
  getCSSParts,
  getCSSProperties,
  getDeclarationByTag,
  getEvents,
  getSlots,
  textOrDash,
} from './cem.ts';

function renderEmptyRow(columns: number, text: string): JSX.Element {
  return (
    <tr>
      <td colSpan={columns}>{text}</td>
    </tr>
  );
}

export function ApiTables({ tag }: Readonly<{ tag: string }>): JSX.Element {
  const declaration = getDeclarationByTag(tag);
  const attributes = getAttributes(declaration);
  const slots = getSlots(declaration);
  const cssParts = getCSSParts(declaration);
  const cssProperties = getCSSProperties(declaration);
  const events = getEvents(declaration);

  return (
    <>
      <h3>
        <code>{tag}</code>
      </h3>

      {!declaration ? (
        <blockquote>
          Could not find <code>{tag}</code> in <code>custom-elements.json</code>
          . Run <code>npm run build:cem</code> and rebuild docs.
        </blockquote>
      ) : null}

      <h4>Attributes</h4>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {attributes.length === 0
            ? renderEmptyRow(3, 'No attributes found.')
            : attributes.map((attribute) => (
                <tr key={attribute.name}>
                  <td>
                    <code>{attribute.name}</code>
                  </td>
                  <td>
                    <code>{attributeType(attribute)}</code>
                  </td>
                  <td>{textOrDash(attribute.description)}</td>
                </tr>
              ))}
        </tbody>
      </table>

      <h4>Slots</h4>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {slots.length === 0
            ? renderEmptyRow(2, 'No slots found.')
            : slots.map((slot) => (
                <tr key={slot.name}>
                  <td>
                    <code>{slot.name}</code>
                  </td>
                  <td>{textOrDash(slot.description)}</td>
                </tr>
              ))}
        </tbody>
      </table>

      <h4>CSS parts</h4>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {cssParts.length === 0
            ? renderEmptyRow(2, 'No CSS parts found.')
            : cssParts.map((part) => (
                <tr key={part.name}>
                  <td>
                    <code>{part.name}</code>
                  </td>
                  <td>{textOrDash(part.description)}</td>
                </tr>
              ))}
        </tbody>
      </table>

      <h4>CSS custom properties</h4>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {cssProperties.length === 0
            ? renderEmptyRow(2, 'No CSS custom properties found.')
            : cssProperties.map((property) => (
                <tr key={property.name}>
                  <td>
                    <code>{property.name}</code>
                  </td>
                  <td>{textOrDash(property.description)}</td>
                </tr>
              ))}
        </tbody>
      </table>

      <h4>Events</h4>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0
            ? renderEmptyRow(2, 'No events found.')
            : events.map((event) => (
                <tr key={event.name}>
                  <td>
                    <code>{event.name}</code>
                  </td>
                  <td>{textOrDash(event.description)}</td>
                </tr>
              ))}
        </tbody>
      </table>
    </>
  );
}
