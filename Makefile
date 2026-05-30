EXTDIR := extension
XPI := moodle_group_bulk_add.xpi

.PHONY: all clean

all: $(XPI)

$(XPI):
	cd $(EXTDIR) && zip -r ../$(XPI) .

clean:
	rm -f $(XPI)
