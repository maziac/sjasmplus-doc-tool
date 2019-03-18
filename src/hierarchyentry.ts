import { ListFile } from './listfile';

/**
 * The elements for the hierarchy map.
 * E.g. text.layer2.print_string, text.ula.print_string, text.layer2.print_char,  will become:
 * text - layer2 - print_string
 *     +- ula - print_string
 *           +- print_char
 */
export class HierarchyEntry {
    /// The line number of the label. Could be -1 if it does not exist.
    public lineNumber: number;

    /// The elements included in an entry. E.g. we are at MODULE level and the
    /// elements are the subroutines. Could be an empty map.
    public elements: Map<string,HierarchyEntry>;

    /// The descriptions of the sub routines.
    public description: string|undefined;


    /**
     * Initializes the entry.
     */
    constructor() {
        this.lineNumber = -1;   // undefined
        this.elements = new Map<string,HierarchyEntry>();
        this.description = undefined;
    }


    /**
     * Searches the hierarchy from top entry to bottom for a given label.
     * @param label E.g. 'text.ula.print_string"
     * @return The corresponding hierarchy element or undefined if not found.
     */
    public getEntry(label: string): HierarchyEntry|undefined {
        // Split first part
        const k = label.indexOf('.');
        if(k < 0) {
            // End found
            return this.elements.get(label);
        }
        const first = label.substr(0, k);
        // Get the rest
        const remaining = label.substr(k+1);
        // Get the part iteratively
        const entry = this.elements.get(first);
        if(!entry)
            return undefined;
        return entry.getEntry(remaining);
    }


    /**
     * For all entries with line numbers the descriptions is extracted 
     * from the file.
     * I.e. the comment lines above the label are used.
     * @param lines All lines of the file.
     */
    public setDescriptions(lines: Array<string>) {
        // Check description for current line
        this.description = HierarchyEntry.getSingleDescription(this.lineNumber, lines);
        
        // Iteratively dive into the sub labels
        for(const [,sublabel] of this.elements) {
            sublabel.setDescriptions(lines);
        }
    }


    /**
     * Retrieves the description/the comments above a label
     * And strips the comments.
     * @param lineNumber The line number of the label. The description is 
     * above. Starts at 0.
     * @param lines All lines of the file.
     * @returns The string with the description (multi-line) or undefined if
     * no description found or lineNumber < 0.
     */
    protected static getSingleDescription(lineNumber: number, lines: Array<string>): string|undefined {
         // Check area above label for comments.

        // First skip empty lines
        let k = lineNumber;
        while(true) {
            k --;
            if(k < 0)
                return undefined; // Already at start of file -> no description text
            const line = lines[k];
            const match = /^\s*$/.exec(line);
            if(!match)
                break;  // Non-empty line found.
            // Check if too many empty lines
            if(lineNumber-k >=3)
                return undefined; // Give up on 4th empty line
        }
        // k now points to first non-empty line above the label.

        // Now take all lines that start with a comment as consecutive description.
       const descr = new Array<string>();
       for(; k>=0; k--) {
            const line = ListFile.getMainLine(lines[k]);
            const match = /^\s*;(.*)/.exec(line);
            if(!match)
                break;  // Line that is no comment-line found
            // Add match to description
            const comment = match[1];
            descr.unshift(comment);
        }

        // Use description
        return descr.join('\n');
    }



    /**
     * Iterates the complete hierarchy and calls the given handler
     * for each element.
     * @param enterHandler(label, entry) Called on every new element.
     * @param exitHandler(label, entry) Called when the element is "left".
     * @param prevLabel The label from the previous iteration. Not intended to be set by
     * the caller of this function but used in iteration.
     */
    public iterate(enterHandler: (label: string, entry: HierarchyEntry) => void, exitHandler = (label: string, entry: HierarchyEntry) => {}, prevLabel = '') {
        // Call handler for all elements.
        for(const [label,entry] of this.elements) {
            // Create complete label
            let totalLabel = label;
            if(prevLabel.length > 0)
                totalLabel = prevLabel + '.' + totalLabel;
            // Call handlers and call recursively
            enterHandler(totalLabel, entry);
            entry.iterate(enterHandler, exitHandler, totalLabel);
            exitHandler(totalLabel, entry);
        }
    }

}
