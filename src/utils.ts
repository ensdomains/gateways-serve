export function flattenErrors(err: unknown) {
	const errors = [String(err)];
	for (let e = err; e instanceof Error && e.cause; e = e.cause) {
	  errors.push(String(e.cause));
	}
	return errors.join(" <== ");
}