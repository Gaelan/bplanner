export async function getTiplocLocations(): Promise<Record<string, [number, number]>> {
	return (await fetch('/tiplocs.json')).json();
}
